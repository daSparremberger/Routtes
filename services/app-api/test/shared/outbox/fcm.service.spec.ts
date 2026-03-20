import { Test } from '@nestjs/testing';
import { FcmService } from '../../../src/shared/outbox/fcm/fcm.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import * as admin from 'firebase-admin';

jest.mock('firebase-admin', () => ({
  messaging: jest.fn().mockReturnValue({
    send: jest.fn(),
  }),
}));

describe('FcmService', () => {
  let service: FcmService;
  let prisma: jest.Mocked<PrismaService>;
  let mockSend: jest.Mock;

  beforeEach(async () => {
    mockSend = (admin.messaging() as any).send;
    mockSend.mockReset();

    const module = await Test.createTestingModule({
      providers: [
        FcmService,
        {
          provide: PrismaService,
          useValue: {
            users: { update: jest.fn() },
            notifications: { create: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get(FcmService);
    prisma = module.get(PrismaService);
  });

  it('should send FCM and record notification', async () => {
    mockSend.mockResolvedValue('message-id-123');
    (prisma.notifications.create as jest.Mock).mockResolvedValue({});

    await service.sendToUser({
      userId: 'user-1',
      tenantId: 'tenant-1',
      fcmToken: 'token-xyz',
      title: 'Rota iniciada',
      body: 'Sua rota foi iniciada pelo motorista',
      data: { type: 'EXECUTION_STARTED', executionId: 'exec-1' },
    });

    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      token: 'token-xyz',
      notification: { title: 'Rota iniciada', body: 'Sua rota foi iniciada pelo motorista' },
    }));
    expect(prisma.notifications.create).toHaveBeenCalled();
  });

  it('should clear expired token and not throw or record notification', async () => {
    const error = Object.assign(new Error('not registered'), {
      code: 'messaging/registration-token-not-registered',
    });
    mockSend.mockRejectedValue(error);
    (prisma.users.update as jest.Mock).mockResolvedValue({});

    await expect(
      service.sendToUser({
        userId: 'user-1',
        tenantId: 'tenant-1',
        fcmToken: 'expired-token',
        title: 'Test',
        body: 'Test',
        data: {},
      }),
    ).resolves.not.toThrow();

    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id: 'user-1', tenant_id: 'tenant-1' },
      data: { fcm_token: null },
    });
    expect(prisma.notifications.create).not.toHaveBeenCalled();
  });

  it('should re-throw on transient FCM errors so outbox worker can retry', async () => {
    const error = Object.assign(new Error('quota-exceeded'), {
      code: 'messaging/quota-exceeded',
    });
    mockSend.mockRejectedValue(error);

    await expect(
      service.sendToUser({
        userId: 'user-1',
        tenantId: 'tenant-1',
        fcmToken: 'valid-token',
        title: 'Test',
        body: 'Test',
        data: {},
      }),
    ).rejects.toThrow('quota-exceeded');

    expect(prisma.users.update).not.toHaveBeenCalled();
    expect(prisma.notifications.create).not.toHaveBeenCalled();
  });
});
