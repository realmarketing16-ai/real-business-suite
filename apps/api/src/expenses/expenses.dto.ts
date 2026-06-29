import { ExpenseCategory } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateExpenseDto {
  @IsString() @MinLength(2) vendor!: string;
  @IsOptional() @IsEnum(ExpenseCategory) category?: ExpenseCategory;
  @IsNumber() @Min(0.01) amount!: number;
  @IsOptional() @IsDateString() spentAt?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() receiptUrl?: string;
}

export class UpdateExpenseDto {
  @IsOptional() @IsString() @MinLength(2) vendor?: string;
  @IsOptional() @IsEnum(ExpenseCategory) category?: ExpenseCategory;
  @IsOptional() @IsNumber() @Min(0.01) amount?: number;
  @IsOptional() @IsDateString() spentAt?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() receiptUrl?: string;
}
