import { InvoiceStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min, MinLength, ValidateNested } from 'class-validator';

export class InvoiceItemDto {
  @IsOptional() @IsString() productId?: string;
  @IsString() @MinLength(2) description!: string;
  @IsNumber() @Min(0.01) quantity!: number;
  @IsNumber() @Min(0) unitPrice!: number;
}

export class CreateInvoiceDto {
  @IsOptional() @IsString() invoiceNo?: string;
  @IsString() customerId!: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsNumber() @Min(0) tax?: number;
  @IsOptional() @IsString() notes?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => InvoiceItemDto) items!: InvoiceItemDto[];
}

export class UpdateInvoiceStatusDto {
  @IsEnum(InvoiceStatus) status!: InvoiceStatus;
}

export class RecordPaymentDto {
  @IsNumber() @Min(0.01) amount!: number;
  @IsOptional() @IsString() method?: string;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsDateString() paidAt?: string;
}
