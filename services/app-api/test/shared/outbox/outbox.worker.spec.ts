import { Test } from '@nestjs/testing';
import { OutboxWorker } from '../../../src/shared/outbox/outbox.worker';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { ExecutionStartedHandler } from '../../../src/shared/outbox/handlers/execution-started.handler';
import { StudentBoardedHandler } from '../../../src/shared/outbox/handlers/student-boarded.handler';
import { StudentDeliveredHandler } from '../../../src/shared/outbox/handlers/student-delivered.handler';
import { RouteCancelledHandler } from '../../../src/shared/outbox/handlers/route-cancelled.handler';

describe('OutboxWorker', () => {
  let worker: OutboxWorker;
  let prisma: jest.Mocked<PrismaService>;
  let executionStartedHandler: jest.Mocked<ExecutionStartedHandler>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OutboxWorker,
        {
          provide: PrismaService,
          useValue: {
            outbox_events: {
              findMany: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        { provide: ExecutionStartedHandler, useValue: { handle: jest.fn() } },
        { provide: StudentBoardedHandler, useValue: { handle: jest.fn() } },
        { provide: StudentDeliveredHandler, useValue: { handle: jest.fn() } },
        { provide: RouteCancelledHandler, useValue: { handle: jest.fn() } },
      ],
    }).compile();

    worker = module.get(OutboxWorker);
    prisma = module.get(PrismaService);
    executionStartedHandler = module.get(ExecutionStartedHandler);
  });

  it('should process pending events and mark as published', async () => {
    const event = {
      id: 'evt-1',
      event_type: 'EXECUTION_STARTED',
      payload: { tenantId: 't1', routeName: 'Rota A' },
      retry_count: 0,
    };
    (prisma.outbox_events.findMany as jest.Mock).mockResolvedValue([event]);
    (prisma.outbox_events.update as jest.Mock).mockResolvedValue({});
    (executionStartedHandler.handle as jest.Mock).mockResolvedValue(undefined);

    await worker.processOutboxEvents();

    expect(executionStartedHandler.handle).toHaveBeenCalledWith(event.payload);
    expect(prisma.outbox_events.update).toHaveBeenCalledWith({
      where: { id: 'evt-1' },
      data: { published: true },
    });
  });

  it('should increment retry_count on failure', async () => {
    const event = {
      id: 'evt-2',
      event_type: 'EXECUTION_STARTED',
      payload: {},
      retry_count: 0,
    };
    (prisma.outbox_events.findMany as jest.Mock).mockResolvedValue([event]);
    (prisma.outbox_events.update as jest.Mock).mockResolvedValue({});
    (executionStartedHandler.handle as jest.Mock).mockRejectedValue(new Error('FCM down'));

    await worker.processOutboxEvents();

    expect(prisma.outbox_events.update).toHaveBeenCalledWith({
      where: { id: 'evt-2' },
      data: expect.objectContaining({ retry_count: 1, last_error: 'FCM down' }),
    });
  });

  it('should mark failed_permanently after 3 failed attempts', async () => {
    const event = {
      id: 'evt-3',
      event_type: 'EXECUTION_STARTED',
      payload: {},
      retry_count: 2,
    };
    (prisma.outbox_events.findMany as jest.Mock).mockResolvedValue([event]);
    (prisma.outbox_events.update as jest.Mock).mockResolvedValue({});
    (executionStartedHandler.handle as jest.Mock).mockRejectedValue(new Error('Persistent error'));

    await worker.processOutboxEvents();

    expect(prisma.outbox_events.update).toHaveBeenCalledWith({
      where: { id: 'evt-3' },
      data: expect.objectContaining({
        retry_count: 3,
        failed_permanently: true,
        last_error: 'Persistent error',
      }),
    });
  });
});
