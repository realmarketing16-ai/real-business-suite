import { BadRequestException, Body, Controller, Get, Headers, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { IsIn } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ensureOwnerOrAdmin } from '../auth/roles';
import { PrismaService } from '../prisma/prisma.service';

type SubscriptionPlan = 'FREE' | 'STARTER' | 'BUSINESS' | 'PRO';
type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
type StripeSubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'paused';
type SubscriptionRecord = {
  id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodEndsAt: Date | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
};
type RequestWithBody = {
  body?: Buffer | Record<string, unknown>;
  rawBody?: Buffer;
};
type StripeCheckoutSession = {
  id: string;
  url?: string | null;
  customer?: string | null;
  subscription?: string | null;
  metadata?: { companyId?: string; plan?: SubscriptionPlan };
};
type StripeSubscription = {
  id: string;
  customer?: string | null;
  status?: StripeSubscriptionStatus;
  current_period_end?: number;
  metadata?: { companyId?: string; plan?: SubscriptionPlan };
};

const planPrices: Record<SubscriptionPlan, number> = {
  FREE: 0,
  STARTER: 29,
  BUSINESS: 79,
  PRO: 149,
};

const planFeatures: Record<SubscriptionPlan, string[]> = {
  FREE: ['Local testing', 'Company setup', 'Core dashboard preview', 'Manual upgrade path'],
  STARTER: ['Core CRM', 'Invoices and quotes', 'Reports exports', 'Email outbox'],
  BUSINESS: ['Everything in Starter', 'Inventory and purchasing', 'Projects and tasks', 'Team roles'],
  PRO: ['Everything in Business', 'Advanced audit history', 'Priority support readiness', 'Multi-location scaling path'],
};

class UpdateSubscriptionPlanDto {
  @IsIn(['FREE', 'STARTER', 'BUSINESS', 'PRO'])
  plan!: SubscriptionPlan;
}

@Controller('billing')
export class BillingController {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async get(@CurrentUser() user: AuthenticatedUser) {
    ensureOwnerOrAdmin(user, 'view billing');
    const subscription = await this.ensureSubscription(user.companyId);

    return {
      subscription,
      access: this.subscriptionAccess(subscription),
      plans: (Object.keys(planPrices) as SubscriptionPlan[]).map((plan) => ({
        plan,
        priceMonthly: planPrices[plan],
        features: planFeatures[plan],
      })),
      checkoutReady: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('plan')
  async updatePlan(@CurrentUser() user: AuthenticatedUser, @Body() input: UpdateSubscriptionPlanDto) {
    ensureOwnerOrAdmin(user, 'manage billing');
    const subscription = await this.subscriptions(this.prisma).upsert({
      where: { companyId: user.companyId },
      create: {
        companyId: user.companyId,
        plan: input.plan,
        status: input.plan === 'FREE' ? 'ACTIVE' : 'TRIALING',
        trialEndsAt: input.plan === 'FREE' ? null : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      update: {
        plan: input.plan,
        status: input.plan === 'FREE' ? 'ACTIVE' : undefined,
        trialEndsAt: input.plan === 'FREE' ? null : undefined,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'BILLING_PLAN_UPDATED',
        entityType: 'Subscription',
        entityId: subscription.id,
        actorId: user.sub,
        companyId: user.companyId,
        description: `Billing plan changed to ${input.plan.toLowerCase()}.`,
        metadata: { plan: input.plan },
      },
    });

    return subscription;
  }

  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  async checkout(@CurrentUser() user: AuthenticatedUser, @Body() input: UpdateSubscriptionPlanDto) {
    ensureOwnerOrAdmin(user, 'manage billing');
    const stripeSecretKey = this.config.get<string>('STRIPE_SECRET_KEY', '');
    if (input.plan === 'FREE') {
      throw new BadRequestException('The Free plan does not require Stripe checkout. Choose it directly from Billing.');
    }
    if (!stripeSecretKey) {
      throw new BadRequestException('Stripe is not configured yet. Set STRIPE_SECRET_KEY before starting checkout.');
    }

    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: user.companyId },
      include: { users: { where: { id: user.sub }, take: 1 } },
    });
    const subscription = await this.ensureSubscription(user.companyId);
    const stripeCustomerId = subscription.stripeCustomerId || await this.createStripeCustomer(stripeSecretKey, {
      companyId: company.id,
      companyName: company.name,
      email: company.users[0]?.email,
    });

    if (!subscription.stripeCustomerId) {
      await this.subscriptions(this.prisma).update({
        where: { companyId: user.companyId },
        data: { stripeCustomerId },
      });
    }

    const session = await this.createStripeCheckoutSession(stripeSecretKey, {
      companyId: user.companyId,
      customerId: stripeCustomerId,
      plan: input.plan,
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'BILLING_CHECKOUT_STARTED',
        entityType: 'Subscription',
        entityId: subscription.id,
        actorId: user.sub,
        companyId: user.companyId,
        description: `Stripe checkout started for ${input.plan.toLowerCase()} plan.`,
        metadata: { plan: input.plan, stripeSessionId: session.id },
      },
    });

    return { url: session.url };
  }

  @Post('webhook')
  async webhook(@Req() request: RequestWithBody, @Headers('stripe-signature') signature = '') {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET', '');
    if (!webhookSecret) {
      throw new BadRequestException('Stripe webhook is not configured.');
    }

    const rawBody = request.rawBody ?? (Buffer.isBuffer(request.body) ? request.body : Buffer.from(JSON.stringify(request.body ?? {})));
    if (!this.isValidStripeSignature(rawBody, signature, webhookSecret)) {
      throw new BadRequestException('Invalid Stripe webhook signature.');
    }

    const event = JSON.parse(rawBody.toString('utf8')) as { type: string; data?: { object?: unknown } };
    if (event.type === 'checkout.session.completed') {
      await this.handleCheckoutCompleted(event.data?.object as StripeCheckoutSession);
    }
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      await this.handleSubscriptionEvent(event.data?.object as StripeSubscription);
    }

    return { received: true };
  }

  private async ensureSubscription(companyId: string) {
    return this.subscriptions(this.prisma).upsert({
      where: { companyId },
      create: {
        companyId,
        plan: 'FREE',
        status: 'ACTIVE',
        trialEndsAt: null,
      },
      update: {},
    });
  }

  private subscriptionAccess(subscription: SubscriptionRecord) {
    if (subscription.status === 'ACTIVE') {
      return { canUseSuite: true, level: 'ok', message: 'Subscription is active.' };
    }
    if (subscription.status === 'TRIALING') {
      return {
        canUseSuite: true,
        level: 'warn',
        message: subscription.trialEndsAt
          ? `Trial access is active until ${subscription.trialEndsAt.toISOString()}.`
          : 'Trial access is active.',
      };
    }
    if (subscription.status === 'PAST_DUE') {
      return {
        canUseSuite: false,
        level: 'block',
        message: 'Payment is past due. Update billing to restore business actions.',
      };
    }
    return {
      canUseSuite: false,
      level: 'block',
      message: 'Subscription is canceled. Choose a plan to restore business actions.',
    };
  }

  private async createStripeCustomer(stripeSecretKey: string, input: { companyId: string; companyName: string; email?: string }) {
    const params = new URLSearchParams();
    params.set('name', input.companyName);
    if (input.email) params.set('email', input.email);
    params.set('metadata[companyId]', input.companyId);
    const customer = await this.stripeRequest<{ id: string }>(stripeSecretKey, '/v1/customers', params);
    return customer.id;
  }

  private async createStripeCheckoutSession(stripeSecretKey: string, input: { companyId: string; customerId: string; plan: SubscriptionPlan }) {
    const webUrl = this.config.get<string>('WEB_URL', 'http://localhost:3000').replace(/\/$/, '');
    const params = new URLSearchParams();
    params.set('mode', 'subscription');
    params.set('customer', input.customerId);
    params.set('success_url', `${webUrl}/dashboard?billing=success`);
    params.set('cancel_url', `${webUrl}/dashboard?billing=cancelled`);
    params.set('client_reference_id', input.companyId);
    params.set('metadata[companyId]', input.companyId);
    params.set('metadata[plan]', input.plan);
    params.set('subscription_data[metadata][companyId]', input.companyId);
    params.set('subscription_data[metadata][plan]', input.plan);
    params.set('line_items[0][quantity]', '1');
    params.set('line_items[0][price_data][currency]', 'usd');
    params.set('line_items[0][price_data][unit_amount]', String(planPrices[input.plan] * 100));
    params.set('line_items[0][price_data][recurring][interval]', 'month');
    params.set('line_items[0][price_data][product_data][name]', `Real Business Suite ${this.planLabel(input.plan)}`);
    params.set('line_items[0][price_data][product_data][metadata][plan]', input.plan);

    return this.stripeRequest<StripeCheckoutSession>(stripeSecretKey, '/v1/checkout/sessions', params);
  }

  private async stripeRequest<T>(stripeSecretKey: string, path: string, params: URLSearchParams) {
    const response = await fetch(`https://api.stripe.com${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = typeof body?.error?.message === 'string' ? body.error.message : `Stripe returned ${response.status}`;
      throw new BadRequestException(message);
    }

    return body as T;
  }

  private isValidStripeSignature(rawBody: Buffer, signature: string, secret: string) {
    const parts = Object.fromEntries(signature.split(',').map((part) => {
      const [key, value] = part.split('=');
      return [key, value];
    }));
    const timestamp = parts.t;
    const expected = parts.v1;
    if (!timestamp || !expected) return false;

    const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
    const actual = createHmac('sha256', secret).update(signedPayload).digest('hex');
    const actualBuffer = Buffer.from(actual);
    const expectedBuffer = Buffer.from(expected);
    return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
  }

  private async handleCheckoutCompleted(session: StripeCheckoutSession) {
    const companyId = session.metadata?.companyId;
    const plan = session.metadata?.plan;
    if (!companyId || !plan) return;

    const subscription = await this.subscriptions(this.prisma).update({
      where: { companyId },
      data: {
        plan,
        status: 'ACTIVE',
        trialEndsAt: null,
        stripeCustomerId: session.customer ?? undefined,
        stripeSubscriptionId: session.subscription ?? undefined,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'BILLING_CHECKOUT_COMPLETED',
        entityType: 'Subscription',
        entityId: subscription.id,
        companyId,
        description: `Stripe checkout completed for ${plan.toLowerCase()} plan.`,
        metadata: { stripeSessionId: session.id, stripeSubscriptionId: session.subscription },
      },
    });
  }

  private async handleSubscriptionEvent(subscription: StripeSubscription) {
    const companyId = subscription.metadata?.companyId;
    const data = {
      status: this.mapStripeStatus(subscription.status),
      currentPeriodEndsAt: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : undefined,
      stripeCustomerId: subscription.customer ?? undefined,
      stripeSubscriptionId: subscription.id,
      ...(subscription.metadata?.plan ? { plan: subscription.metadata.plan } : {}),
    };

    const updated = companyId
      ? await this.subscriptions(this.prisma).update({ where: { companyId }, data })
      : await this.updateManyByStripe(subscription.id, subscription.customer ?? undefined, data);

    if (updated) {
      await this.prisma.auditLog.create({
        data: {
          action: 'BILLING_SUBSCRIPTION_SYNCED',
          entityType: 'Subscription',
          entityId: updated.id,
          companyId: updated.companyId,
          description: `Stripe subscription synced as ${updated.status.toLowerCase()}.`,
          metadata: { stripeSubscriptionId: subscription.id, stripeStatus: subscription.status },
        },
      });
    }
  }

  private mapStripeStatus(status?: StripeSubscriptionStatus): SubscriptionStatus {
    if (status === 'active') return 'ACTIVE';
    if (status === 'past_due' || status === 'unpaid' || status === 'incomplete') return 'PAST_DUE';
    if (status === 'canceled' || status === 'incomplete_expired') return 'CANCELED';
    return 'TRIALING';
  }

  private planLabel(plan: SubscriptionPlan) {
    return plan.toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
  }

  private subscriptions(client: unknown) {
    return (client as {
      subscription: {
        upsert(args: unknown): Promise<SubscriptionRecord>;
        update(args: unknown): Promise<SubscriptionRecord>;
        findFirst(args: unknown): Promise<SubscriptionRecord | null>;
      };
    }).subscription;
  }

  private async updateManyByStripe(stripeSubscriptionId: string, stripeCustomerId: string | undefined, data: Record<string, unknown>) {
    const subscription = await this.subscriptions(this.prisma).findFirst({
      where: {
        OR: [
          { stripeSubscriptionId },
          ...(stripeCustomerId ? [{ stripeCustomerId }] : []),
        ],
      },
    });
    if (!subscription) return null;
    return this.subscriptions(this.prisma).update({ where: { id: subscription.id }, data });
  }
}
