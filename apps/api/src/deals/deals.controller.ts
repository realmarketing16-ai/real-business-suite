import { Body, Controller, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ensureManagerOrAbove } from '../auth/roles';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDealDto, UpdateDealDto } from './deals.dto';

function serializeDeal(deal: any) {
  return { ...deal, value: Number(deal.value ?? 0) };
}

@UseGuards(JwtAuthGuard)
@Controller('deals')
export class DealsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const deals = await this.prisma.deal.findMany({
      where: { companyId: user.companyId },
      include: { customer: true },
      orderBy: [{ stage: 'asc' }, { updatedAt: 'desc' }],
    });
    return deals.map(serializeDeal);
  }

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateDealDto) {
    ensureManagerOrAbove(user, 'create deals');
    const customer = await this.prisma.customer.findFirst({ where: { id: input.customerId, companyId: user.companyId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const deal = await this.prisma.deal.create({
      data: {
        title: input.title,
        customerId: input.customerId,
        companyId: user.companyId,
        stage: input.stage,
        value: input.value,
        expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : undefined,
        notes: input.notes,
      },
      include: { customer: true },
    });
    return serializeDeal(deal);
  }

  @Patch(':id')
  async update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() input: UpdateDealDto) {
    ensureManagerOrAbove(user, 'update deals');
    const existing = await this.prisma.deal.findFirst({ where: { id, companyId: user.companyId } });
    if (!existing) throw new NotFoundException('Deal not found');

    const deal = await this.prisma.deal.update({
      where: { id },
      data: {
        ...input,
        expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : undefined,
      },
      include: { customer: true },
    });
    return serializeDeal(deal);
  }
}
