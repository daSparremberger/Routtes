import { Test } from '@nestjs/testing';
import { ExecutionStartedHandler } from '../../../src/shared/outbox/handlers/execution-started.handler';
import { StudentBoardedHandler } from '../../../src/shared/outbox/handlers/student-boarded.handler';
import { StudentDeliveredHandler } from '../../../src/shared/outbox/handlers/student-delivered.handler';
import { RouteCancelledHandler } from '../../../src/shared/outbox/handlers/route-cancelled.handler';
import { FcmService } from '../../../src/shared/outbox/fcm/fcm.service';
import { WhatsAppService } from '../../../src/shared/outbox/whatsapp/whatsapp.service';
import { PrismaService } from '../../../src/prisma/prisma.service';

describe('ExecutionStartedHandler', () => {
  let handler: ExecutionStartedHandler;
  let prisma: jest.Mocked<PrismaService>;
  let fcm: jest.Mocked<FcmService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ExecutionStartedHandler,
        { provide: PrismaService, useValue: { users: { findMany: jest.fn() } } },
        { provide: FcmService, useValue: { sendToUser: jest.fn() } },
      ],
    }).compile();
    handler = module.get(ExecutionStartedHandler);
    prisma = module.get(PrismaService);
    fcm = module.get(FcmService);
  });

  it('should send FCM to all active managers with fcm_token', async () => {
    (prisma.users.findMany as jest.Mock).mockResolvedValue([
      { id: 'mgr-1', fcm_token: 'tok-1' },
      { id: 'mgr-2', fcm_token: 'tok-2' },
    ]);
    (fcm.sendToUser as jest.Mock).mockResolvedValue(undefined);

    await handler.handle({ executionId: 'e1', tenantId: 't1', routeName: 'Rota A' });

    expect(fcm.sendToUser).toHaveBeenCalledTimes(2);
    expect(fcm.sendToUser).toHaveBeenCalledWith(expect.objectContaining({ fcmToken: 'tok-1' }));
  });

  it('should not fail when no managers have fcm_token', async () => {
    (prisma.users.findMany as jest.Mock).mockResolvedValue([]);
    await expect(handler.handle({ executionId: 'e1', tenantId: 't1', routeName: 'R' })).resolves.not.toThrow();
    expect(fcm.sendToUser).not.toHaveBeenCalled();
  });
});

describe('StudentBoardedHandler', () => {
  let handler: StudentBoardedHandler;
  let whatsapp: jest.Mocked<WhatsAppService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        StudentBoardedHandler,
        { provide: WhatsAppService, useValue: { sendTemplate: jest.fn() } },
      ],
    }).compile();
    handler = module.get(StudentBoardedHandler);
    whatsapp = module.get(WhatsAppService);
  });

  it('should send WhatsApp template with boarding details', async () => {
    (whatsapp.sendTemplate as jest.Mock).mockResolvedValue(undefined);
    await handler.handle({
      studentName: 'João',
      guardianPhone: '5511999998888',
      guardianName: 'Maria',
      boardedAt: new Date().toISOString(),
    });
    expect(whatsapp.sendTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: '5511999998888',
        templateName: 'embarque_confirmado',
      }),
    );
  });

  it('should skip send when guardianPhone is absent', async () => {
    await handler.handle({ studentName: 'João', guardianPhone: null, boardedAt: '' });
    expect(whatsapp.sendTemplate).not.toHaveBeenCalled();
  });
});

describe('StudentDeliveredHandler', () => {
  let handler: StudentDeliveredHandler;
  let whatsapp: jest.Mocked<WhatsAppService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        StudentDeliveredHandler,
        { provide: WhatsAppService, useValue: { sendTemplate: jest.fn() } },
      ],
    }).compile();
    handler = module.get(StudentDeliveredHandler);
    whatsapp = module.get(WhatsAppService);
  });

  it('should send WhatsApp template with delivery details', async () => {
    (whatsapp.sendTemplate as jest.Mock).mockResolvedValue(undefined);
    await handler.handle({
      studentName: 'João',
      guardianPhone: '5511999998888',
      guardianName: 'Maria',
      deliveredAt: new Date().toISOString(),
    });
    expect(whatsapp.sendTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: '5511999998888',
        templateName: 'desembarque_confirmado',
      }),
    );
  });

  it('should skip send when guardianPhone is absent', async () => {
    await handler.handle({ studentName: 'João', guardianPhone: null, deliveredAt: '' });
    expect(whatsapp.sendTemplate).not.toHaveBeenCalled();
  });
});

describe('RouteCancelledHandler', () => {
  let handler: RouteCancelledHandler;
  let whatsapp: jest.Mocked<WhatsAppService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RouteCancelledHandler,
        { provide: WhatsAppService, useValue: { sendTemplate: jest.fn() } },
      ],
    }).compile();
    handler = module.get(RouteCancelledHandler);
    whatsapp = module.get(WhatsAppService);
  });

  it('should notify all guardian phones on cancellation', async () => {
    (whatsapp.sendTemplate as jest.Mock).mockResolvedValue(undefined);
    await handler.handle({
      routeName: 'Rota B',
      guardianPhones: ['5511111111111', '5522222222222'],
    });
    expect(whatsapp.sendTemplate).toHaveBeenCalledTimes(2);
  });

  it('should not fail when no guardian phones provided', async () => {
    (whatsapp.sendTemplate as jest.Mock).mockResolvedValue(undefined);
    await expect(
      handler.handle({
        routeName: 'Rota B',
        guardianPhones: [],
      }),
    ).resolves.not.toThrow();
    expect(whatsapp.sendTemplate).not.toHaveBeenCalled();
  });
});
