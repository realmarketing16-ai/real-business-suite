import { ProjectStatus, TaskPriority, TaskStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateProjectDto {
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsEnum(ProjectStatus) status?: ProjectStatus;
  @IsOptional() @IsNumber() @Min(0) budget?: number;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateProjectDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsEnum(ProjectStatus) status?: ProjectStatus;
  @IsOptional() @IsNumber() @Min(0) budget?: number;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsString() description?: string;
}

export class CreateTaskDto {
  @IsString() @MinLength(2) title!: string;
  @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus;
  @IsOptional() @IsEnum(TaskPriority) priority?: TaskPriority;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsString() assignee?: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateTaskDto {
  @IsOptional() @IsString() @MinLength(2) title?: string;
  @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus;
  @IsOptional() @IsEnum(TaskPriority) priority?: TaskPriority;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsString() assignee?: string;
  @IsOptional() @IsString() description?: string;
}
