import { Module, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configValidationSchema } from './app.config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { RequestLoggerMiddleware } from './shared/middleware/request-logger.middleware';
import { SchoolsModule } from './operational/schools/schools.module';
import { StudentsModule } from './operational/students/students.module';
import { DriversModule } from './operational/drivers/drivers.module';
import { VehiclesModule } from './operational/vehicles/vehicles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configValidationSchema,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    SchoolsModule,
    StudentsModule,
    DriversModule,
    VehiclesModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
