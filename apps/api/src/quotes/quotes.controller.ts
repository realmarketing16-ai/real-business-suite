import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteDto, UpdateQuoteStatusDto } from './quotes.dto';

function money(value: Prisma.Decimal | number | string | null | undefined) {
  return Number(value ?? 0);
}

function serializeQuote(quote: any) {
  return {
    ...quote,
    subtotal: money(quote.subtotal),
    tax: money(quote.tax),
    total: money(quote.total),
    items: (quote.items ?? []).map((item: any) => ({
      ...item,
      quantity: money(item.quantity),
      unitPrice: money(item.unitPrice),
      lineTotal: money(item.lineTotal),
    })),
  };
}

@UseGuards(JwtAuthGuard)
@Controller('quotes')
export class QuotesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const quotes = await this.prisma.quote.findMany({
      where: { companyId: user.companyId },
      include: { customer: true, items: true },
      orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
    });
    return quotes.map(serializeQuote);
  }

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateQuoteDto) {
    const customer = await this.prisma.customer.findFirst({ where: { id: input.customerId, companyId: user.companyId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const quoteNo = input.quoteNo?.trim() || await this.nextQuoteNumber(user.companyId);
    const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const tax = input.tax ?? 0;
    const total = subtotal + tax;

    try {
      const quote = await this.prisma.quote.create({
        data: {
          quoteNo,
          customerId: input.customerId,
          companyId: user.companyId,
          validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
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
        include: { customer: true, items: true },
      });
      return serializeQuote(quote);
    } catch (cause) {
      if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === 'P2002') {
        throw new BadRequestException('Quote number already exists');
      }
      throw cause;
    }
  }

  @Patch(':id/status')
  async updateStatus(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() input: UpdateQuoteStatusDto) {
    await this.ensureQuote(user.companyId, id);
    const quote = await this.prisma.quote.update({
      where: { id },
      data: { status: input.status },
      include: { customer: true, items: true },
    });
    return serializeQuote(quote);
  }

  private async ensureQuote(companyId: string, id: string) {
    const quote = await this.prisma.quote.findFirst({ where: { id, companyId } });
    if (!quote) throw new NotFoundException('Quote not found');
    return quote;
  }

  private async nextQuoteNumber(companyId: string) {
    const count = await this.prisma.quote.count({ where: { companyId } });
    return `QTE-${String(count + 1).padStart(4, '0')}`;
  }
}
