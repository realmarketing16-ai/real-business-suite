import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CompaniesController } from './companies.controller';

@Module({ imports: [AuthModule], controllers: [CompaniesController] })
export class CompaniesModule {}
