import { Body, Controller, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ensureManagerOrAbove } from '../auth/roles';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './products.dto';

@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const products = await this.prisma.product.findMany({
      where: { companyId: user.companyId },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
    return products.map((product) => ({ ...product, unitPrice: Number(product.unitPrice) }));
  }

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateProductDto) {
    ensureManagerOrAbove(user, 'create products and services');
    const product = await this.prisma.product.create({ data: { ...input, companyId: user.companyId } });
    return { ...product, unitPrice: Number(product.unitPrice) };
  }

  @Patch(':id')
  async update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() input: UpdateProductDto) {
    ensureManagerOrAbove(user, 'update products and services');
    const existing = await this.prisma.product.findFirst({ where: { id, companyId: user.companyId } });
    if (!existing) throw new NotFoundException('Product or service not found');
    const product = await this.prisma.product.update({ where: { id }, data: input });
    return { ...product, unitPrice: Number(product.unitPrice) };
  }
}
