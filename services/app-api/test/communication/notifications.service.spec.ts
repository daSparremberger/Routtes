import { Test } from '@nestjs/testing';
import { NotificationsService } from '../../src/communication/notifications/notifications.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrismaService = {
      users: {
        update: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get(NotificationsService);
    prisma = module.get(PrismaService);
  });

  it('should update fcm_token for the authenticated user', async () => {
    const userId = 'user-uuid-123';
    const token = 'fcm-token-abc';
    prisma.users.update.mockResolvedValue({ id: userId, fcm_token: token });

    await service.updateFcmToken(userId, token);

    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { fcm_token: token },
    });
  });
});
