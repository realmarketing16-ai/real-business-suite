import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService, private readonly config: ConfigService) {}

  async register(input: RegisterDto) {
    const email = input.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('An account already exists for this email');
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({ data: { name: input.companyName.trim() } });
      const owner = await tx.user.create({
        data: {
          email,
          passwordHash: await hash(input.password, 12),
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          role: 'OWNER',
          companyId: company.id,
        },
        include: { company: true },
      });
      await tx.auditLog.create({
        data: {
          action: 'REGISTER',
          entityType: 'User',
          entityId: owner.id,
          actorId: owner.id,
          companyId: owner.companyId,
          description: `${owner.firstName} ${owner.lastName} registered ${company.name}.`,
          metadata: { email: owner.email, role: owner.role },
        },
      });
      return owner;
    });

    return this.session(user);
  }

  async login(input: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.trim().toLowerCase() },
      include: { company: true },
    });
    if (!user || !(await compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException('Incorrect email or password');
    }
    await this.prisma.auditLog.create({
      data: {
        action: 'LOGIN',
        entityType: 'User',
        entityId: user.id,
        actorId: user.id,
        companyId: user.companyId,
        description: `${user.firstName} ${user.lastName} signed in.`,
        metadata: { email: user.email, role: user.role },
      },
    });
    return this.session(user);
  }

  async forgotPassword(input: ForgotPasswordDto) {
    const email = input.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email }, include: { company: true } });
    if (!user) return { message: 'If that email exists, a reset link has been sent.' };

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const webUrl = this.config.get<string>('WEB_URL', 'http://localhost:3000');
    const resetUrl = `${webUrl.replace(/\/$/, '')}/reset-password?token=${token}`;

    const message = await this.prisma.$transaction(async (tx) => {
      const passwordResetToken = this.passwordResetTokens(tx);
      await passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      await passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } });
      await tx.auditLog.create({
        data: {
          action: 'PASSWORD_RESET_REQUESTED',
          entityType: 'User',
          entityId: user.id,
          actorId: user.id,
          companyId: user.companyId,
          description: `Password reset was requested for ${user.email}.`,
          metadata: { email: user.email, expiresAt: expiresAt.toISOString() },
        },
      });
      return tx.emailMessage.create({
        data: {
          companyId: user.companyId,
          to: user.email,
          subject: 'Reset your Real Business Suite password',
          body: `Hello ${user.firstName},\n\nUse this link to reset your password. It expires in 60 minutes:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
          relatedType: 'password_reset',
          relatedId: user.id,
        },
      });
    });
    await this.deliverPasswordResetEmail(message);

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPassword(input: ResetPasswordDto) {
    const tokenHash = this.hashToken(input.token.trim());
    const reset = await this.passwordResetTokens(this.prisma).findUnique({ where: { tokenHash }, include: { user: { include: { company: true } } } });
    if (!reset || !reset.user || reset.usedAt || reset.expiresAt <= new Date()) {
      throw new UnauthorizedException('Password reset link is invalid or expired');
    }
    const resetUser = reset.user;

    const passwordHash = await hash(input.password, 12);
    const user = await this.prisma.$transaction(async (tx) => {
      const passwordResetToken = this.passwordResetTokens(tx);
      await tx.user.update({ where: { id: reset.userId }, data: { passwordHash } });
      await passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } });
      await passwordResetToken.updateMany({
        where: { userId: reset.userId, usedAt: null },
        data: { usedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          action: 'PASSWORD_RESET_COMPLETED',
          entityType: 'User',
          entityId: reset.userId,
          actorId: reset.userId,
          companyId: resetUser.companyId,
          description: `Password was reset for ${resetUser.email}.`,
          metadata: { email: resetUser.email },
        },
      });
      return tx.user.findUniqueOrThrow({ where: { id: reset.userId }, include: { company: true } });
    });

    return this.session(user);
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async deliverPasswordResetEmail(message: { id: string; to: string; subject: string; body: string }) {
    const dryRun = this.config.get<string>('EMAIL_DRY_RUN', '').toLowerCase() === 'true';
    if (dryRun) {
      await this.prisma.emailMessage.update({
        where: { id: message.id },
        data: { status: 'SENT', provider: 'dry-run', sentAt: new Date(), error: null },
      });
      return;
    }

    const resendApiKey = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('EMAIL_FROM');
    if (!resendApiKey || !from) {
      await this.prisma.emailMessage.update({
        where: { id: message.id },
        data: { status: 'FAILED', provider: 'resend', error: 'Email delivery is not configured. Set RESEND_API_KEY and EMAIL_FROM.' },
      });
      return;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        text: message.body,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      await this.prisma.emailMessage.update({
        where: { id: message.id },
        data: { status: 'FAILED', provider: 'resend', error: error.slice(0, 500) || `Resend returned ${response.status}` },
      });
      return;
    }

    await this.prisma.emailMessage.update({
      where: { id: message.id },
      data: { status: 'SENT', provider: 'resend', sentAt: new Date(), error: null },
    });
  }

  private passwordResetTokens(client: unknown) {
    return (client as {
      passwordResetToken: {
        create(args: unknown): Promise<unknown>;
        findUnique(args: unknown): Promise<
          | ({
              id: string;
              userId: string;
              usedAt: Date | null;
              expiresAt: Date;
              user?: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
                role: string;
                companyId: string;
                company: { id: string; name: string };
              };
            } & Record<string, unknown>)
          | null
        >;
        update(args: unknown): Promise<unknown>;
        updateMany(args: unknown): Promise<unknown>;
      };
    }).passwordResetToken;
  }

  private async session(user: { id: string; email: string; firstName: string; lastName: string; role: string; companyId: string; company: { id: string; name: string } }) {
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, companyId: user.companyId, role: user.role });
    return {
      accessToken,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
      company: user.company,
    };
  }
}
