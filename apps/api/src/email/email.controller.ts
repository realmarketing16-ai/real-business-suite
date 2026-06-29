import { Controller, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';

@UseGuards(JwtAuthGuard)
@Controller('email')
export class EmailController {
  constructor(private readonly prisma: PrismaService, private readonly email: EmailService) {}

  @Get('outbox')
  async outbox(@CurrentUser() user: AuthenticatedUser) {
    this.ensureCanManageEmail(user);
    const messages = await this.prisma.emailMessage.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return messages.map((message) => ({
      ...message,
      bodyPreview: message.body.length > 180 ? `${message.body.slice(0, 180)}...` : message.body,
    }));
  }

  @Post('outbox/send-queued')
  sendQueued(@CurrentUser() user: AuthenticatedUser) {
    this.ensureCanManageEmail(user);
    return this.email.sendQueued(user.companyId);
  }

  @Post('outbox/:id/send')
  sendOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    this.ensureCanManageEmail(user);
    return this.email.send(user.companyId, id);
  }

  private ensureCanManageEmail(user: AuthenticatedUser) {
    if (user.role !== Role.OWNER && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only owners and admins can manage email outbox');
    }
  }
}
