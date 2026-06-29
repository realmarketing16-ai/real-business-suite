import { PurchaseOrderStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min, MinLength, ValidateNested } from 'class-validator';

export class CreateSupplierDto {
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() notes?: string;
}

export class CreateInventoryItemDto {
  @IsString() @MinLength(2) sku!: string;
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Min(0) quantity?: number;
  @IsOptional() @IsNumber() @Min(0) reorderLevel?: number;
  @IsOptional() @IsNumber() @Min(0) unitCost?: number;
  @IsOptional() @IsString() supplierId?: string;
}

export class PurchaseOrderItemDto {
  @IsOptional() @IsString() inventoryItemId?: string;
  @IsString() @MinLength(2) description!: string;
  @IsNumber() @Min(0.01) quantity!: number;
  @IsNumber() @Min(0) unitCost!: number;
}

export class CreatePurchaseOrderDto {
  @IsOptional() @IsString() orderNo?: string;
  @IsString() supplierId!: string;
  @IsOptional() @IsDateString() expectedAt?: string;
  @IsOptional() @IsNumber() @Min(0) tax?: number;
  @IsOptional() @IsString() notes?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => PurchaseOrderItemDto) items!: PurchaseOrderItemDto[];
}

export class UpdatePurchaseOrderStatusDto {
  @IsEnum(PurchaseOrderStatus) status!: PurchaseOrderStatus;
}
