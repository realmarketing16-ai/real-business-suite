import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('summary')
  async summary(@CurrentUser() user: AuthenticatedUser) {
    const [company, employeeCount, activeEmployees, departments] = await Promise.all([
      this.prisma.company.findUniqueOrThrow({ where: { id: user.companyId } }),
      this.prisma.employee.count({ where: { companyId: user.companyId } }),
      this.prisma.employee.count({ where: { companyId: user.companyId, status: 'ACTIVE' } }),
      this.prisma.employee.findMany({
        where: { companyId: user.companyId, department: { not: null } },
        distinct: ['department'],
        select: { department: true },
      }),
    ]);

    return {
      company,
      metrics: {
        employees: employeeCount,
        activeEmployees,
        departments: departments.length,
        productsEnabled: 1,
      },
      suggestions: [
        employeeCount === 0 ? 'Add your first employee' : 'Review your employee records',
        company.industry ? 'Company profile is ready' : 'Complete your company industry',
      ],
    };
  }
}
