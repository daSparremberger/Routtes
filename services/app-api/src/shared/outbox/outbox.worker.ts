import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { ExecutionStartedHandler } from './handlers/execution-started.handler';
import { StudentBoardedHandler } from './handlers/student-boarded.handler';
import { StudentDeliveredHandler } from './handlers/student-delivered.handler';
import { RouteCancelledHandler } from './handlers/route-cancelled.handler';

const MAX_RETRIES = 3;

type OutboxHandler = { handle(payload: Record<string, any>): Promise<void> };

@Injectable()
export class OutboxWorker {
  private readonly logger = new Logger(OutboxWorker.name);
  private readonly handlers: Record<string, OutboxHandler>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly executionStartedHandler: ExecutionStartedHandler,
    private readonly studentBoardedHandler: StudentBoardedHandler,
    private readonly studentDeliveredHandler: StudentDeliveredHandler,
    private readonly routeCancelledHandler: RouteCancelledHandler,
  ) {
    this.handlers = {
      EXECUTION_STARTED: this.executionStartedHandler,
      STUDENT_BOARDED: this.studentBoardedHandler,
      STUDENT_DELIVERED: this.studentDeliveredHandler,
      ROUTE_CANCELLED: this.routeCancelledHandler,
    };
  }

  @Cron('*/5 * * * * *')
  async processOutboxEvents(): Promise<void> {
    const events = await this.prisma.outbox_events.findMany({
      where: { published: false, failed_permanently: false },
      orderBy: { created_at: 'asc' },
      take: 50,
    });

    if (events.length === 0) return;

    this.logger.debug(`Processing ${events.length} outbox events`);

    for (const event of events) {
      const handler = this.handlers[event.event_type];

      if (!handler) {
        this.logger.warn(`No handler for event_type: ${event.event_type} (id: ${event.id})`);
        await this.prisma.outbox_events.update({
          where: { id: event.id },
          data: {
            failed_permanently: true,
            last_error: `No handler registered for event_type "${event.event_type}"`,
          },
        });
        continue;
      }

      try {
        await handler.handle(event.payload as Record<string, any>);
        await this.prisma.outbox_events.update({
          where: { id: event.id },
          data: { published: true },
        });
      } catch (err: any) {
        const newRetryCount = (event.retry_count ?? 0) + 1;
        const errorMessage = err?.message ?? String(err);
        const failedPermanently = newRetryCount >= MAX_RETRIES;

        this.logger.error(
          `Outbox event ${event.id} (${event.event_type}) failed (attempt ${newRetryCount}/${MAX_RETRIES}): ${errorMessage}`,
        );

        await this.prisma.outbox_events.update({
          where: { id: event.id },
          data: {
            retry_count: newRetryCount,
            last_error: errorMessage,
            ...(failedPermanently && { failed_permanently: true }),
          },
        });
      }
    }
  }
}
