import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../../prisma/prisma.module';
import { OutboxWorker } from './outbox.worker';
import { FcmModule } from './fcm/fcm.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { ExecutionStartedHandler } from './handlers/execution-started.handler';
import { StudentBoardedHandler } from './handlers/student-boarded.handler';
import { StudentDeliveredHandler } from './handlers/student-delivered.handler';
import { RouteCancelledHandler } from './handlers/route-cancelled.handler';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    FcmModule,
    WhatsAppModule,
  ],
  providers: [
    OutboxWorker,
    ExecutionStartedHandler,
    StudentBoardedHandler,
    StudentDeliveredHandler,
    RouteCancelledHandler,
  ],
})
export class OutboxModule {}
