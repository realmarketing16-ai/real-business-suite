import { Controller, ForbiddenException, Get, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    if (user.role !== Role.OWNER && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only owners and admins can view audit logs');
    }
    const logs = await this.prisma.auditLog.findMany({
      where: { companyId: user.companyId },
      include: { actor: { select: { firstName: true, lastName: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return logs.map((log) => ({
      ...log,
      actorName: log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'System',
    }));
  }
}
