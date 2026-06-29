import { Controller, ForbiddenException, Get, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('email')
export class EmailController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('outbox')
  async outbox(@CurrentUser() user: AuthenticatedUser) {
    if (user.role !== Role.OWNER && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only owners and admins can view email outbox');
    }
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
}
