import { Injectable } from '@nestjs/common';
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
  constructor(private readonly prisma: PrismaService) {}

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
}
