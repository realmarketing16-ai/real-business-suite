import { ProductType } from '@prisma/client';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateProductDto {
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(ProductType) type?: ProductType;
  @IsNumber() @Min(0) unitPrice!: number;
}

export class UpdateProductDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(ProductType) type?: ProductType;
  @IsOptional() @IsNumber() @Min(0) unitPrice?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}
