import { Controller, Get, Header, Param, Res, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ensureManagerOrAbove } from '../auth/roles';
import { PrismaService } from '../prisma/prisma.service';

type ExportType = 'profit-loss' | 'customers' | 'invoices' | 'expenses';

function money(value: unknown) {
  return Number(value ?? 0);
}

function csvEscape(value: unknown) {
  const text = value instanceof Date ? value.toISOString() : String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  return [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n');
}

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('summary')
  async summary(@CurrentUser() user: AuthenticatedUser) {
    const [payments, expenses, invoices, customers, deals] = await Promise.all([
      this.prisma.payment.aggregate({ where: { companyId: user.companyId, status: 'RECORDED' }, _sum: { amount: true } }),
      this.prisma.expense.aggregate({ where: { companyId: user.companyId }, _sum: { amount: true } }),
      this.prisma.invoice.groupBy({ by: ['status'], where: { companyId: user.companyId }, _count: { _all: true }, _sum: { total: true } }),
      this.prisma.customer.groupBy({ by: ['status'], where: { companyId: user.companyId }, _count: { _all: true } }),
      this.prisma.deal.groupBy({ by: ['stage'], where: { companyId: user.companyId }, _count: { _all: true }, _sum: { value: true } }),
    ]);

    const revenue = money(payments._sum.amount);
    const totalExpenses = money(expenses._sum.amount);

    return {
      profitLoss: {
        revenue,
        expenses: totalExpenses,
        netProfit: revenue - totalExpenses,
      },
      invoices: invoices.map((item) => ({ status: item.status, count: item._count._all, total: money(item._sum.total) })),
      customers: customers.map((item) => ({ status: item.status, count: item._count._all })),
      deals: deals.map((item) => ({ stage: item.stage, count: item._count._all, value: money(item._sum.value) })),
      exports: ['profit-loss', 'customers', 'invoices', 'expenses'],
    };
  }

  @Get('export/:type')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async export(@CurrentUser() user: AuthenticatedUser, @Param('type') type: ExportType, @Res({ passthrough: true }) response: any) {
    ensureManagerOrAbove(user, 'export reports');
    const rows = await this.rowsForExport(user.companyId, type);
    response.setHeader('Content-Disposition', `attachment; filename="${type}.csv"`);
    return toCsv(rows);
  }

  private async rowsForExport(companyId: string, type: ExportType): Promise<Record<string, unknown>[]> {
    if (type === 'customers') {
      const customers = await this.prisma.customer.findMany({ where: { companyId }, orderBy: { updatedAt: 'desc' } });
      return customers.map((customer) => ({
        name: customer.name,
        company: customer.companyName,
        email: customer.email,
        phone: customer.phone,
        status: customer.status,
        notes: customer.notes,
        createdAt: customer.createdAt,
      }));
    }

    if (type === 'invoices') {
      const invoices = await this.prisma.invoice.findMany({
        where: { companyId },
        include: { customer: true, payments: true },
        orderBy: { issueDate: 'desc' },
      });
      return invoices.map((invoice) => {
        const paid = invoice.payments.filter((payment) => payment.status === 'RECORDED').reduce((sum, payment) => sum + money(payment.amount), 0);
        const total = money(invoice.total);
        return {
          invoiceNo: invoice.invoiceNo,
          customer: invoice.customer.name,
          status: invoice.status,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          total,
          paid,
          balance: Math.max(total - paid, 0),
        };
      });
    }

    if (type === 'expenses') {
      const expenses = await this.prisma.expense.findMany({ where: { companyId }, orderBy: { spentAt: 'desc' } });
      return expenses.map((expense) => ({
        vendor: expense.vendor,
        category: expense.category,
        amount: money(expense.amount),
        spentAt: expense.spentAt,
        description: expense.description,
        receiptUrl: expense.receiptUrl,
      }));
    }

    const [payments, expenses] = await Promise.all([
      this.prisma.payment.aggregate({ where: { companyId, status: 'RECORDED' }, _sum: { amount: true } }),
      this.prisma.expense.aggregate({ where: { companyId }, _sum: { amount: true } }),
    ]);
    const revenue = money(payments._sum.amount);
    const totalExpenses = money(expenses._sum.amount);
    return [
      { metric: 'Revenue collected', amount: revenue },
      { metric: 'Expenses', amount: totalExpenses },
      { metric: 'Net profit', amount: revenue - totalExpenses },
    ];
  }
}
