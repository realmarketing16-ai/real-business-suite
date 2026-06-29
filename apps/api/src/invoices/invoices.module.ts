import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { InvoicesController } from './invoices.controller';

@Module({
  imports: [AuthModule, EmailModule],
  controllers: [InvoicesController],
})
export class InvoicesModule {}
