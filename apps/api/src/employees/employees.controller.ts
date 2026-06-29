import { Body, Controller, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ensureManagerOrAbove } from '../auth/roles';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './employees.dto';

@UseGuards(JwtAuthGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.prisma.employee.findMany({ where: { companyId: user.companyId }, orderBy: [{ status: 'asc' }, { lastName: 'asc' }] });
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateEmployeeDto) {
    ensureManagerOrAbove(user, 'create employees');
    return this.prisma.employee.create({ data: { ...input, companyId: user.companyId } });
  }

  @Patch(':id')
  async update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() input: UpdateEmployeeDto) {
    ensureManagerOrAbove(user, 'update employees');
    const existing = await this.prisma.employee.findFirst({ where: { id, companyId: user.companyId } });
    if (!existing) throw new NotFoundException('Employee not found');
    return this.prisma.employee.update({ where: { id }, data: input });
  }
}
