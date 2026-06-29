import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { CustomersModule } from './customers/customers.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DealsModule } from './deals/deals.module';
import { EmployeesModule } from './employees/employees.module';
import { ExpensesModule } from './expenses/expenses.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ProductsModule } from './products/products.module';
import { ProjectsModule } from './projects/projects.module';
import { ReportsModule } from './reports/reports.module';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CompaniesModule,
    EmployeesModule,
    CustomersModule,
    DealsModule,
    ExpensesModule,
    ProductsModule,
    ProjectsModule,
    InvoicesModule,
    ReportsModule,
    DashboardModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
