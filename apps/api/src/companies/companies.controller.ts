import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCompanyDto } from './companies.dto';

@UseGuards(JwtAuthGuard)
@Controller('company')
export class CompaniesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.prisma.company.findUniqueOrThrow({ where: { id: user.companyId } });
  }

  @Patch()
  update(@CurrentUser() user: AuthenticatedUser, @Body() input: UpdateCompanyDto) {
    return this.prisma.company.update({ where: { id: user.companyId }, data: input });
  }
}
