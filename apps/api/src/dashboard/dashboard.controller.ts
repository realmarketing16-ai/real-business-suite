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
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const [company, employeeCount, activeEmployees, departments, customerCount, activeCustomers, productCount, invoiceCount, openInvoices, invoiceTotals, paymentTotals, dealCount, openDeals, wonDeals, lostDeals, pipelineTotals, wonDealTotals, expenseCount, expenseTotals, monthlyExpenseTotals, projectCount, activeProjects, taskCount, openTasks, overdueTasks, teamCount, adminCount] = await Promise.all([
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
      this.prisma.deal.count({ where: { companyId: user.companyId } }),
      this.prisma.deal.count({ where: { companyId: user.companyId, stage: { in: ['NEW_LEAD', 'CONTACTED', 'PROPOSAL_SENT'] } } }),
      this.prisma.deal.count({ where: { companyId: user.companyId, stage: 'WON' } }),
      this.prisma.deal.count({ where: { companyId: user.companyId, stage: 'LOST' } }),
      this.prisma.deal.aggregate({
        where: { companyId: user.companyId, stage: { in: ['NEW_LEAD', 'CONTACTED', 'PROPOSAL_SENT'] } },
        _sum: { value: true },
      }),
      this.prisma.deal.aggregate({
        where: { companyId: user.companyId, stage: 'WON' },
        _sum: { value: true },
      }),
      this.prisma.expense.count({ where: { companyId: user.companyId } }),
      this.prisma.expense.aggregate({
        where: { companyId: user.companyId },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { companyId: user.companyId, spentAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.project.count({ where: { companyId: user.companyId } }),
      this.prisma.project.count({ where: { companyId: user.companyId, status: 'ACTIVE' } }),
      this.prisma.task.count({ where: { companyId: user.companyId } }),
      this.prisma.task.count({ where: { companyId: user.companyId, status: { in: ['TODO', 'IN_PROGRESS', 'BLOCKED'] } } }),
      this.prisma.task.count({ where: { companyId: user.companyId, status: { not: 'DONE' }, dueDate: { lt: new Date() } } }),
      this.prisma.user.count({ where: { companyId: user.companyId } }),
      this.prisma.user.count({ where: { companyId: user.companyId, role: { in: ['OWNER', 'ADMIN'] } } }),
    ]);

    const invoiced = Number(invoiceTotals._sum.total ?? 0);
    const collected = Number(paymentTotals._sum.amount ?? 0);
    const outstanding = Math.max(invoiced - collected, 0);
    const decidedDeals = wonDeals + lostDeals;
    const conversionRate = decidedDeals === 0 ? 0 : Math.round((wonDeals / decidedDeals) * 100);
    const expenses = Number(expenseTotals._sum.amount ?? 0);
    const monthlyExpenses = Number(monthlyExpenseTotals._sum.amount ?? 0);
    const netProfit = collected - expenses;

    return {
      company,
      metrics: {
        employees: employeeCount,
        activeEmployees,
        departments: departments.length,
        customers: customerCount,
        activeCustomers,
        products: productCount,
        deals: dealCount,
        openDeals,
        wonDeals,
        pipelineValue: Number(pipelineTotals._sum.value ?? 0),
        wonDealValue: Number(wonDealTotals._sum.value ?? 0),
        conversionRate,
        invoices: invoiceCount,
        openInvoices,
        revenue: collected,
        expenses,
        monthlyExpenses,
        netProfit,
        expenseCount,
        projects: projectCount,
        activeProjects,
        tasks: taskCount,
        openTasks,
        overdueTasks,
        teamMembers: teamCount,
        admins: adminCount,
        outstanding,
        productsEnabled: 7,
      },
      suggestions: [
        employeeCount === 0 ? 'Add your first employee' : 'Review your employee records',
        company.industry ? 'Company profile is ready' : 'Complete your company industry',
        customerCount === 0 ? 'Add your first customer or lead' : 'Keep customer records current',
        openDeals === 0 ? 'Create a sales deal for an active opportunity' : 'Move sales deals through the pipeline',
        productCount === 0 ? 'Create your first product or service' : 'Review pricing and service catalog',
        expenseCount === 0 ? 'Record business expenses to see net profit' : netProfit >= 0 ? 'Profit is positive after recorded expenses' : 'Review expenses against collected revenue',
        projectCount === 0 ? 'Create your first project and task list' : overdueTasks > 0 ? 'Review overdue tasks' : 'Keep project work moving',
        teamCount === 1 ? 'Add your first team member' : 'Review team roles and access',
        openInvoices === 0 ? 'Create and send an invoice when ready' : 'Follow up on open invoices',
      ],
    };
  }
}
