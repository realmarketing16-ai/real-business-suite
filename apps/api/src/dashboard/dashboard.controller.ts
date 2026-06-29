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
    const [company, employeeCount, activeEmployees, departments, customerCount, activeCustomers, productCount, invoiceCount, openInvoices, invoiceTotals, paymentTotals] = await Promise.all([
      this.prisma.company.findUniqueOrThrow({ where: { id: user.companyId } }),
      this.prisma.employee.count({ where: { companyId: user.companyId } }),
      this.prisma.employee.count({ where: { companyId: user.companyId, status: 'ACTIVE' } }),
      this.prisma.employee.findMany({
        where: { companyId: user.companyId, department: { not: null } },
        distinct: ['department'],
        select: { department: true },
      }),
      this.prisma.customer.count({ where: { companyId: user.companyId } }),
      this.prisma.customer.count({ where: { companyId: user.companyId, status: 'ACTIVE' } }),
      this.prisma.product.count({ where: { companyId: user.companyId, active: true } }),
      this.prisma.invoice.count({ where: { companyId: user.companyId } }),
      this.prisma.invoice.count({ where: { companyId: user.companyId, status: { in: ['DRAFT', 'SENT', 'OVERDUE'] } } }),
      this.prisma.invoice.aggregate({
        where: { companyId: user.companyId, status: { not: 'VOID' } },
        _sum: { total: true },
      }),
      this.prisma.payment.aggregate({
        where: { companyId: user.companyId, status: 'RECORDED' },
        _sum: { amount: true },
      }),
    ]);

    const invoiced = Number(invoiceTotals._sum.total ?? 0);
    const collected = Number(paymentTotals._sum.amount ?? 0);
    const outstanding = Math.max(invoiced - collected, 0);

    return {
      company,
      metrics: {
        employees: employeeCount,
        activeEmployees,
        departments: departments.length,
        customers: customerCount,
        activeCustomers,
        products: productCount,
        invoices: invoiceCount,
        openInvoices,
        revenue: collected,
        outstanding,
        productsEnabled: 4,
      },
      suggestions: [
        employeeCount === 0 ? 'Add your first employee' : 'Review your employee records',
        company.industry ? 'Company profile is ready' : 'Complete your company industry',
        customerCount === 0 ? 'Add your first customer or lead' : 'Keep customer records current',
        productCount === 0 ? 'Create your first product or service' : 'Review pricing and service catalog',
        openInvoices === 0 ? 'Create and send an invoice when ready' : 'Follow up on open invoices',
      ],
    };
  }
}
