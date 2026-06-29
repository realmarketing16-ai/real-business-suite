import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { IsIn } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ensureOwnerOrAdmin } from '../auth/roles';
import { PrismaService } from '../prisma/prisma.service';

type SubscriptionPlan = 'STARTER' | 'BUSINESS' | 'PRO';
type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
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

const planPrices: Record<SubscriptionPlan, number> = {
  STARTER: 29,
  BUSINESS: 79,
  PRO: 149,
};

const planFeatures: Record<SubscriptionPlan, string[]> = {
  STARTER: ['Core CRM', 'Invoices and quotes', 'Reports exports', 'Email outbox'],
  BUSINESS: ['Everything in Starter', 'Inventory and purchasing', 'Projects and tasks', 'Team roles'],
  PRO: ['Everything in Business', 'Advanced audit history', 'Priority support readiness', 'Multi-location scaling path'],
};

class UpdateSubscriptionPlanDto {
  @IsIn(['STARTER', 'BUSINESS', 'PRO'])
  plan!: SubscriptionPlan;
}

@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get(@CurrentUser() user: AuthenticatedUser) {
    ensureOwnerOrAdmin(user, 'view billing');
    const subscription = await this.ensureSubscription(user.companyId);

    return {
      subscription,
      plans: (Object.keys(planPrices) as SubscriptionPlan[]).map((plan) => ({
        plan,
        priceMonthly: planPrices[plan],
        features: planFeatures[plan],
      })),
      checkoutReady: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
    };
  }

  @Patch('plan')
  async updatePlan(@CurrentUser() user: AuthenticatedUser, @Body() input: UpdateSubscriptionPlanDto) {
    ensureOwnerOrAdmin(user, 'manage billing');
    const subscription = await this.subscriptions(this.prisma).upsert({
      where: { companyId: user.companyId },
      create: {
        companyId: user.companyId,
        plan: input.plan,
        status: 'TRIALING',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      update: { plan: input.plan },
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

  private async ensureSubscription(companyId: string) {
    return this.subscriptions(this.prisma).upsert({
      where: { companyId },
      create: {
        companyId,
        plan: 'STARTER',
        status: 'TRIALING',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      update: {},
    });
  }

  private subscriptions(client: unknown) {
    return (client as {
      subscription: {
        upsert(args: unknown): Promise<SubscriptionRecord>;
      };
    }).subscription;
  }
}
