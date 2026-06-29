import { Body, Controller, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto, UpdateExpenseDto } from './expenses.dto';

function serializeExpense(expense: any) {
  return { ...expense, amount: Number(expense.amount ?? 0) };
}

@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const expenses = await this.prisma.expense.findMany({
      where: { companyId: user.companyId },
      orderBy: [{ spentAt: 'desc' }, { createdAt: 'desc' }],
    });
    return expenses.map(serializeExpense);
  }

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateExpenseDto) {
    const expense = await this.prisma.expense.create({
      data: {
        vendor: input.vendor,
        category: input.category,
        amount: input.amount,
        spentAt: input.spentAt ? new Date(input.spentAt) : undefined,
        description: input.description,
        receiptUrl: input.receiptUrl,
        companyId: user.companyId,
      },
    });
    return serializeExpense(expense);
  }

  @Patch(':id')
  async update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() input: UpdateExpenseDto) {
    const existing = await this.prisma.expense.findFirst({ where: { id, companyId: user.companyId } });
    if (!existing) throw new NotFoundException('Expense not found');
    const expense = await this.prisma.expense.update({
      where: { id },
      data: {
        ...input,
        spentAt: input.spentAt ? new Date(input.spentAt) : undefined,
      },
    });
    return serializeExpense(expense);
  }
}
