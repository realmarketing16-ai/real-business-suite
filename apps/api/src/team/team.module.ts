import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { TeamController } from './team.controller';

@Module({
  imports: [AuthModule, EmailModule],
  controllers: [TeamController],
})
export class TeamModule {}
