import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { CustomersModule } from './customers/customers.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DealsModule } from './deals/deals.module';
import { EmailModule } from './email/email.module';
import { EmployeesModule } from './employees/employees.module';
import { ExpensesModule } from './expenses/expenses.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ProductsModule } from './products/products.module';
import { ProjectsModule } from './projects/projects.module';
import { PurchasingModule } from './purchasing/purchasing.module';
import { QuotesModule } from './quotes/quotes.module';
import { ReadinessModule } from './readiness/readiness.module';
import { ReportsModule } from './reports/reports.module';
import { TeamModule } from './team/team.module';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    AuditLogsModule,
    AuthModule,
    CompaniesModule,
    EmployeesModule,
    CustomersModule,
    DealsModule,
    EmailModule,
    ExpensesModule,
    ProductsModule,
    ProjectsModule,
    PurchasingModule,
    QuotesModule,
    ReadinessModule,
    InvoicesModule,
    ReportsModule,
    TeamModule,
    DashboardModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
