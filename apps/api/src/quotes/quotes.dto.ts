import { QuoteStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min, MinLength, ValidateNested } from 'class-validator';

export class QuoteItemDto {
  @IsOptional() @IsString() productId?: string;
  @IsString() @MinLength(2) description!: string;
  @IsNumber() @Min(0.01) quantity!: number;
  @IsNumber() @Min(0) unitPrice!: number;
}

export class CreateQuoteDto {
  @IsOptional() @IsString() quoteNo?: string;
  @IsString() customerId!: string;
  @IsOptional() @IsDateString() validUntil?: string;
  @IsOptional() @IsNumber() @Min(0) tax?: number;
  @IsOptional() @IsString() notes?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => QuoteItemDto) items!: QuoteItemDto[];
}

export class UpdateQuoteStatusDto {
  @IsEnum(QuoteStatus) status!: QuoteStatus;
}
