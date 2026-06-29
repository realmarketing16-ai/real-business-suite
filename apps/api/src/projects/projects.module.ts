import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProjectsController } from './projects.controller';

@Module({
  imports: [AuthModule],
  controllers: [ProjectsController],
})
export class ProjectsModule {}
