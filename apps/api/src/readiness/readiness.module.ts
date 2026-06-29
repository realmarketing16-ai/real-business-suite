import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReadinessController } from './readiness.controller';

@Module({
  imports: [AuthModule],
  controllers: [ReadinessController],
})
export class ReadinessModule {}
