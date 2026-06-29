import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ExpensesController } from './expenses.controller';

@Module({
  imports: [AuthModule],
  controllers: [ExpensesController],
})
export class ExpensesModule {}
