import { Body, Controller, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './customers.dto';

@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.prisma.customer.findMany({
      where: { companyId: user.companyId },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateCustomerDto) {
    return this.prisma.customer.create({ data: { ...input, companyId: user.companyId } });
  }

  @Patch(':id')
  async update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() input: UpdateCustomerDto) {
    const existing = await this.prisma.customer.findFirst({ where: { id, companyId: user.companyId } });
    if (!existing) throw new NotFoundException('Customer not found');
    return this.prisma.customer.update({ where: { id }, data: input });
  }
}
