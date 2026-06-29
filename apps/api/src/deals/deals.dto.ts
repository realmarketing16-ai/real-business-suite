import { DealStage } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateDealDto {
  @IsString() @MinLength(2) title!: string;
  @IsString() customerId!: string;
  @IsOptional() @IsEnum(DealStage) stage?: DealStage;
  @IsNumber() @Min(0) value!: number;
  @IsOptional() @IsDateString() expectedCloseDate?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateDealDto {
  @IsOptional() @IsString() @MinLength(2) title?: string;
  @IsOptional() @IsEnum(DealStage) stage?: DealStage;
  @IsOptional() @IsNumber() @Min(0) value?: number;
  @IsOptional() @IsDateString() expectedCloseDate?: string;
  @IsOptional() @IsString() notes?: string;
}
