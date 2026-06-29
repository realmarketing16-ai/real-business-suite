import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PurchasingController } from './purchasing.controller';

@Module({
  imports: [AuthModule],
  controllers: [PurchasingController],
})
export class PurchasingModule {}
