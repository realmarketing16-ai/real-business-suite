import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { QuotesController } from './quotes.controller';

@Module({
  imports: [AuthModule],
  controllers: [QuotesController],
})
export class QuotesModule {}
