import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TeamController } from './team.controller';

@Module({
  imports: [AuthModule],
  controllers: [TeamController],
})
export class TeamModule {}
