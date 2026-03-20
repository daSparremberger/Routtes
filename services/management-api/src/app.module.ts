import { Module, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configValidationSchema } from './app.config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './admin/tenants/tenants.module';
import { LicensesModule } from './admin/licenses/licenses.module';
import { ModulesModule } from './admin/modules/modules.module';
import { OrganizationsModule } from './admin/organizations/organizations.module';
import { ContractsModule } from './admin/contracts/contracts.module';
import { InvoicesModule } from './admin/invoices/invoices.module';
import { DashboardModule } from './admin/dashboard/dashboard.module';
import { RequestLoggerMiddleware } from './shared/middleware/request-logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configValidationSchema,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    TenantsModule,
    LicensesModule,
    ModulesModule,
    OrganizationsModule,
    ContractsModule,
    InvoicesModule,
    DashboardModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
