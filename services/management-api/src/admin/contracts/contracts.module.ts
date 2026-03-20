import { Module } from '@nestjs/common';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../../shared/audit/audit.module';
import { LicensesModule } from '../licenses/licenses.module';

@Module({
  imports: [PrismaModule, AuditModule, LicensesModule],
  controllers: [ContractsController],
  providers: [ContractsService],
})
export class ContractsModule {}
