import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EmployeesController } from './employees.controller';

@Module({ imports: [AuthModule], controllers: [EmployeesController] })
export class EmployeesModule {}
