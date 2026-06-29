import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailMessage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type QueueEmailInput = {
  companyId: string;
  to: string;
  subject: string;
  body: string;
  relatedType?: string;
  relatedId?: string;
};

@Injectable()
export class EmailService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  queue(input: QueueEmailInput) {
    return this.prisma.emailMessage.create({
      data: {
        companyId: input.companyId,
        to: input.to,
        subject: input.subject,
        body: input.body,
        relatedType: input.relatedType,
        relatedId: input.relatedId,
      },
    });
  }

  async send(companyId: string, id: string) {
    const message = await this.prisma.emailMessage.findFirst({ where: { id, companyId } });
    if (!message) throw new NotFoundException('Email message not found');
    if (message.status === 'SENT') return message;
    return this.deliver(message);
  }

  async sendQueued(companyId: string) {
    const messages = await this.prisma.emailMessage.findMany({
      where: { companyId, status: 'QUEUED' },
      orderBy: { createdAt: 'asc' },
      take: 25,
    });
    const results = [];
    for (const message of messages) {
      results.push(await this.deliver(message));
    }
    return { attempted: messages.length, sent: results.filter((message) => message.status === 'SENT').length, failed: results.filter((message) => message.status === 'FAILED').length };
  }

  private async deliver(message: EmailMessage) {
    const dryRun = this.config.get<string>('EMAIL_DRY_RUN', '').toLowerCase() === 'true';
    if (dryRun) {
      return this.prisma.emailMessage.update({
        where: { id: message.id },
        data: { status: 'SENT', provider: 'dry-run', sentAt: new Date(), error: null },
      });
    }

    const resendApiKey = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('EMAIL_FROM');
    if (!resendApiKey || !from) {
      return this.prisma.emailMessage.update({
        where: { id: message.id },
        data: { status: 'FAILED', provider: 'resend', error: 'Email delivery is not configured. Set RESEND_API_KEY and EMAIL_FROM.' },
      });
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
      return this.prisma.emailMessage.update({
        where: { id: message.id },
        data: { status: 'FAILED', provider: 'resend', error: error.slice(0, 500) || `Resend returned ${response.status}` },
      });
    }

    return this.prisma.emailMessage.update({
      where: { id: message.id },
      data: { status: 'SENT', provider: 'resend', sentAt: new Date(), error: null },
    });
  }
}
