import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto, RecordPaymentDto, UpdateInvoiceStatusDto } from './invoices.dto';

function money(value: Prisma.Decimal | number | string | null | undefined) {
  return Number(value ?? 0);
}

function serializeInvoice(invoice: any) {
  const payments = invoice.payments ?? [];
  const paid = payments.filter((payment: any) => payment.status === 'RECORDED').reduce((sum: number, payment: any) => sum + money(payment.amount), 0);
  const total = money(invoice.total);
  return {
    ...invoice,
    subtotal: money(invoice.subtotal),
    tax: money(invoice.tax),
    total,
    paid,
    balance: Math.max(total - paid, 0),
    items: (invoice.items ?? []).map((item: any) => ({
      ...item,
      quantity: money(item.quantity),
      unitPrice: money(item.unitPrice),
      lineTotal: money(item.lineTotal),
    })),
    payments: payments.map((payment: any) => ({ ...payment, amount: money(payment.amount) })),
  };
}

@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const invoices = await this.prisma.invoice.findMany({
      where: { companyId: user.companyId },
      include: {
        customer: true,
        items: true,
        payments: true,
      },
      orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
    });
    return invoices.map(serializeInvoice);
  }

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateInvoiceDto) {
    const customer = await this.prisma.customer.findFirst({ where: { id: input.customerId, companyId: user.companyId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const invoiceNo = input.invoiceNo?.trim() || await this.nextInvoiceNumber(user.companyId);
    const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const tax = input.tax ?? 0;
    const total = subtotal + tax;

    try {
      const invoice = await this.prisma.invoice.create({
        data: {
          invoiceNo,
          customerId: input.customerId,
          companyId: user.companyId,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
          subtotal,
          tax,
          total,
          notes: input.notes,
          items: {
            create: input.items.map((item) => ({
              productId: item.productId || undefined,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.quantity * item.unitPrice,
            })),
          },
        },
        include: { customer: true, items: true, payments: true },
      });
      return serializeInvoice(invoice);
    } catch (cause) {
      if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === 'P2002') {
        throw new BadRequestException('Invoice number already exists');
      }
      throw cause;
    }
  }

  @Patch(':id/status')
  async updateStatus(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() input: UpdateInvoiceStatusDto) {
    await this.ensureInvoice(user.companyId, id);
    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: { status: input.status },
      include: { customer: true, items: true, payments: true },
    });
    return serializeInvoice(invoice);
  }

  @Post(':id/payments')
  async recordPayment(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() input: RecordPaymentDto) {
    const invoice = await this.ensureInvoice(user.companyId, id);
    await this.prisma.payment.create({
      data: {
        invoiceId: id,
        companyId: user.companyId,
        amount: input.amount,
        method: input.method,
        reference: input.reference,
        paidAt: input.paidAt ? new Date(input.paidAt) : undefined,
      },
    });

    const paid = await this.prisma.payment.aggregate({
      where: { invoiceId: id, status: 'RECORDED' },
      _sum: { amount: true },
    });
    if (money(paid._sum.amount) >= money(invoice.total)) {
      await this.prisma.invoice.update({ where: { id }, data: { status: InvoiceStatus.PAID } });
    }

    const updated = await this.prisma.invoice.findUniqueOrThrow({
      where: { id },
      include: { customer: true, items: true, payments: true },
    });
    return serializeInvoice(updated);
  }

  private async ensureInvoice(companyId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, companyId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  private async nextInvoiceNumber(companyId: string) {
    const count = await this.prisma.invoice.count({ where: { companyId } });
    return `INV-${String(count + 1).padStart(4, '0')}`;
  }
}
