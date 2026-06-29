import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { QuotesController } from './quotes.controller';

@Module({
  imports: [AuthModule, EmailModule],
  controllers: [QuotesController],
})
export class QuotesModule {}
