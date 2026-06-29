import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DealsController } from './deals.controller';

@Module({
  imports: [AuthModule],
  controllers: [DealsController],
})
export class DealsModule {}
