import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Res, UseGuards } from '@nestjs/common';
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

function pdfEscape(value: unknown) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function currency(value: Prisma.Decimal | number | string | null | undefined) {
  return `$${money(value).toFixed(2)}`;
}

function formatDate(value: unknown) {
  if (!value) return '-';
  return new Date(value as string | Date).toLocaleDateString('en-US');
}

function buildInvoicePdf(invoice: any) {
  const paid = (invoice.payments ?? []).filter((payment: any) => payment.status === 'RECORDED').reduce((sum: number, payment: any) => sum + money(payment.amount), 0);
  const balance = Math.max(money(invoice.total) - paid, 0);
  const lines = [
    { text: invoice.company.name, x: 50, y: 760, size: 20 },
    { text: 'INVOICE', x: 440, y: 760, size: 22 },
    { text: `Invoice #: ${invoice.invoiceNo}`, x: 440, y: 730, size: 11 },
    { text: `Status: ${invoice.status}`, x: 440, y: 714, size: 11 },
    { text: `Issued: ${formatDate(invoice.issueDate)}`, x: 440, y: 698, size: 11 },
    { text: `Due: ${formatDate(invoice.dueDate)}`, x: 440, y: 682, size: 11 },
    { text: 'Bill to', x: 50, y: 700, size: 12 },
    { text: invoice.customer.name, x: 50, y: 680, size: 14 },
    { text: invoice.customer.companyName || '', x: 50, y: 662, size: 10 },
    { text: invoice.customer.email || '', x: 50, y: 646, size: 10 },
    { text: invoice.customer.phone || '', x: 50, y: 630, size: 10 },
    { text: 'Description', x: 50, y: 580, size: 11 },
    { text: 'Qty', x: 335, y: 580, size: 11 },
    { text: 'Unit', x: 390, y: 580, size: 11 },
    { text: 'Total', x: 470, y: 580, size: 11 },
  ];

  let y = 555;
  for (const item of invoice.items ?? []) {
    lines.push(
      { text: item.description, x: 50, y, size: 10 },
      { text: money(item.quantity).toString(), x: 335, y, size: 10 },
      { text: currency(item.unitPrice), x: 390, y, size: 10 },
      { text: currency(item.lineTotal), x: 470, y, size: 10 },
    );
    y -= 20;
  }

  lines.push(
    { text: `Subtotal: ${currency(invoice.subtotal)}`, x: 390, y: 170, size: 11 },
    { text: `Tax: ${currency(invoice.tax)}`, x: 390, y: 150, size: 11 },
    { text: `Total: ${currency(invoice.total)}`, x: 390, y: 130, size: 13 },
    { text: `Paid: ${currency(paid)}`, x: 390, y: 108, size: 11 },
    { text: `Balance: ${currency(balance)}`, x: 390, y: 88, size: 13 },
    { text: invoice.notes ? `Notes: ${invoice.notes}` : 'Thank you for your business.', x: 50, y: 110, size: 10 },
  );

  const textOps = lines
    .filter((line) => line.text)
    .map((line) => `BT /F1 ${line.size} Tf ${line.x} ${line.y} Td (${pdfEscape(line.text)}) Tj ET`)
    .join('\n');
  const content = `0.8 w 50 595 m 545 595 l S\n${textOps}`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
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

  @Get(':id/pdf')
  async pdf(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Res() response: any) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId: user.companyId },
      include: { company: true, customer: true, items: true, payments: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    const pdf = buildInvoicePdf(invoice);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNo}.pdf"`);
    response.setHeader('Content-Length', pdf.length);
    response.end(pdf);
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
