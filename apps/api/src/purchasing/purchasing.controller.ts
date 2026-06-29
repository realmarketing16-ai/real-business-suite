import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Prisma, PurchaseOrderStatus } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryItemDto, CreatePurchaseOrderDto, CreateSupplierDto, UpdatePurchaseOrderStatusDto } from './purchasing.dto';

function money(value: Prisma.Decimal | number | string | null | undefined) {
  return Number(value ?? 0);
}

function serializeInventory(item: any) {
  return { ...item, quantity: money(item.quantity), reorderLevel: money(item.reorderLevel), unitCost: money(item.unitCost) };
}

function serializePurchaseOrder(order: any) {
  return {
    ...order,
    subtotal: money(order.subtotal),
    tax: money(order.tax),
    total: money(order.total),
    items: (order.items ?? []).map((item: any) => ({
      ...item,
      quantity: money(item.quantity),
      unitCost: money(item.unitCost),
      lineTotal: money(item.lineTotal),
    })),
  };
}

@UseGuards(JwtAuthGuard)
@Controller('purchasing')
export class PurchasingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async overview(@CurrentUser() user: AuthenticatedUser) {
    const [suppliers, inventoryItems, purchaseOrders] = await Promise.all([
      this.prisma.supplier.findMany({ where: { companyId: user.companyId }, orderBy: { name: 'asc' } }),
      this.prisma.inventoryItem.findMany({ where: { companyId: user.companyId }, include: { supplier: true }, orderBy: { name: 'asc' } }),
      this.prisma.purchaseOrder.findMany({ where: { companyId: user.companyId }, include: { supplier: true, items: true }, orderBy: [{ orderedAt: 'desc' }, { createdAt: 'desc' }] }),
    ]);
    return {
      suppliers,
      inventoryItems: inventoryItems.map(serializeInventory),
      purchaseOrders: purchaseOrders.map(serializePurchaseOrder),
    };
  }

  @Post('suppliers')
  async createSupplier(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateSupplierDto) {
    const supplier = await this.prisma.supplier.create({ data: { ...input, companyId: user.companyId } });
    await this.prisma.auditLog.create({
      data: {
        action: 'created',
        entityType: 'supplier',
        entityId: supplier.id,
        description: `Added supplier ${supplier.name}`,
        metadata: { email: supplier.email, phone: supplier.phone },
        actorId: user.sub,
        companyId: user.companyId,
      },
    });
    return supplier;
  }

  @Post('inventory')
  async createInventory(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateInventoryItemDto) {
    if (input.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({ where: { id: input.supplierId, companyId: user.companyId } });
      if (!supplier) throw new NotFoundException('Supplier not found');
    }
    try {
      const item = await this.prisma.inventoryItem.create({
        data: {
          sku: input.sku.trim(),
          name: input.name,
          description: input.description,
          quantity: input.quantity ?? 0,
          reorderLevel: input.reorderLevel ?? 0,
          unitCost: input.unitCost ?? 0,
          supplierId: input.supplierId || undefined,
          companyId: user.companyId,
        },
        include: { supplier: true },
      });
      await this.prisma.auditLog.create({
        data: {
          action: 'created',
          entityType: 'inventory_item',
          entityId: item.id,
          description: `Added inventory item ${item.name}`,
          metadata: { sku: item.sku, quantity: money(item.quantity), reorderLevel: money(item.reorderLevel) },
          actorId: user.sub,
          companyId: user.companyId,
        },
      });
      return serializeInventory(item);
    } catch (cause) {
      if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === 'P2002') {
        throw new BadRequestException('SKU already exists');
      }
      throw cause;
    }
  }

  @Post('purchase-orders')
  async createPurchaseOrder(@CurrentUser() user: AuthenticatedUser, @Body() input: CreatePurchaseOrderDto) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id: input.supplierId, companyId: user.companyId } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    for (const item of input.items) {
      if (item.inventoryItemId) {
        const inventory = await this.prisma.inventoryItem.findFirst({ where: { id: item.inventoryItemId, companyId: user.companyId } });
        if (!inventory) throw new NotFoundException('Inventory item not found');
      }
    }
    const orderNo = input.orderNo?.trim() || await this.nextOrderNumber(user.companyId);
    const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
    const tax = input.tax ?? 0;
    try {
      const order = await this.prisma.purchaseOrder.create({
        data: {
          orderNo,
          supplierId: input.supplierId,
          companyId: user.companyId,
          expectedAt: input.expectedAt ? new Date(input.expectedAt) : undefined,
          subtotal,
          tax,
          total: subtotal + tax,
          notes: input.notes,
          items: {
            create: input.items.map((item) => ({
              inventoryItemId: item.inventoryItemId || undefined,
              description: item.description,
              quantity: item.quantity,
              unitCost: item.unitCost,
              lineTotal: item.quantity * item.unitCost,
            })),
          },
        },
        include: { supplier: true, items: true },
      });
      await this.prisma.auditLog.create({
        data: {
          action: 'created',
          entityType: 'purchase_order',
          entityId: order.id,
          description: `Created purchase order ${order.orderNo}`,
          metadata: { supplier: supplier.name, total: money(order.total) },
          actorId: user.sub,
          companyId: user.companyId,
        },
      });
      return serializePurchaseOrder(order);
    } catch (cause) {
      if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === 'P2002') {
        throw new BadRequestException('Purchase order number already exists');
      }
      throw cause;
    }
  }

  @Patch('purchase-orders/:id/status')
  async updatePurchaseOrderStatus(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() input: UpdatePurchaseOrderStatusDto) {
    const existing = await this.prisma.purchaseOrder.findFirst({ where: { id, companyId: user.companyId }, include: { items: true } });
    if (!existing) throw new NotFoundException('Purchase order not found');

    const order = await this.prisma.$transaction(async (tx) => {
      if (input.status === PurchaseOrderStatus.RECEIVED && existing.status !== PurchaseOrderStatus.RECEIVED) {
        for (const item of existing.items) {
          if (item.inventoryItemId) {
            await tx.inventoryItem.update({
              where: { id: item.inventoryItemId },
              data: { quantity: { increment: item.quantity } },
            });
          }
        }
      }
      return tx.purchaseOrder.update({
        where: { id },
        data: { status: input.status },
        include: { supplier: true, items: true },
      });
    });
    await this.prisma.auditLog.create({
      data: {
        action: 'updated_status',
        entityType: 'purchase_order',
        entityId: order.id,
        description: `Marked purchase order ${order.orderNo} as ${input.status.toLowerCase()}`,
        metadata: { previousStatus: existing.status, status: input.status },
        actorId: user.sub,
        companyId: user.companyId,
      },
    });
    return serializePurchaseOrder(order);
  }

  private async nextOrderNumber(companyId: string) {
    const count = await this.prisma.purchaseOrder.count({ where: { companyId } });
    return `PO-${String(count + 1).padStart(4, '0')}`;
  }
}
