import { Body, ConflictException, Controller, ForbiddenException, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { hash } from 'bcryptjs';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamMemberDto, UpdateTeamMemberDto } from './team.dto';

function serializeUser(user: any) {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

@UseGuards(JwtAuthGuard)
@Controller('team')
export class TeamController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const members = await this.prisma.user.findMany({
      where: { companyId: user.companyId },
      orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
    });
    return members.map(serializeUser);
  }

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateTeamMemberDto) {
    this.ensureCanManageTeam(user);
    const email = input.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('An account already exists for this email');
    }

    const member = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await hash(input.password, 12),
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        role: input.role,
        companyId: user.companyId,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        action: 'created',
        entityType: 'team_member',
        entityId: member.id,
        description: `Added team member ${member.firstName} ${member.lastName}`,
        metadata: { email: member.email, role: member.role },
        actorId: user.sub,
        companyId: user.companyId,
      },
    });
    return serializeUser(member);
  }

  @Patch(':id')
  async update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() input: UpdateTeamMemberDto) {
    this.ensureCanManageTeam(user);
    const existing = await this.prisma.user.findFirst({ where: { id, companyId: user.companyId } });
    if (!existing) throw new NotFoundException('Team member not found');
    if (existing.role === Role.OWNER && input.role && input.role !== Role.OWNER) {
      const ownerCount = await this.prisma.user.count({ where: { companyId: user.companyId, role: Role.OWNER } });
      if (ownerCount <= 1) throw new ForbiddenException('A company must keep at least one owner');
    }

    const member = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: input.firstName?.trim(),
        lastName: input.lastName?.trim(),
        role: input.role,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        action: 'updated',
        entityType: 'team_member',
        entityId: member.id,
        description: `Updated team member ${member.firstName} ${member.lastName}`,
        metadata: { role: member.role },
        actorId: user.sub,
        companyId: user.companyId,
      },
    });
    return serializeUser(member);
  }

  private ensureCanManageTeam(user: AuthenticatedUser) {
    if (user.role !== Role.OWNER && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only owners and admins can manage team members');
    }
  }
}
