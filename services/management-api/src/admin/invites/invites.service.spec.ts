import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { InvitesService } from './invites.service';
import { AuditService } from '../../shared/audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';

const prismaMock = {
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
};
const auditMock = { log: jest.fn() };

describe('InvitesService', () => {
  let service: InvitesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        InvitesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();
    service = module.get<InvitesService>(InvitesService);
  });

  describe('generateManagerInvite', () => {
    it('should insert into app.invite_tokens via $queryRaw', async () => {
      prismaMock.$queryRaw.mockResolvedValue([{ id: 'inv-uuid', token: 'tok123', expires_at: new Date() }]);

      const result = await service.generateManagerInvite({ tenantId: 't1', email: 'g@x.com' }, 'actor');

      expect(prismaMock.$queryRaw).toHaveBeenCalled();
      expect(result).toHaveProperty('token');
    });
  });

  describe('resendInvite', () => {
    it('should throw NotFoundException if invite not found', async () => {
      prismaMock.$queryRaw.mockResolvedValue([]);
      await expect(service.resendInvite('bad-id', 'actor')).rejects.toThrow(NotFoundException);
    });

    it('should update expires_at on resend', async () => {
      prismaMock.$queryRaw.mockResolvedValue([{ id: 'inv-1', token: 'tok123', used_at: null }]);
      prismaMock.$executeRaw.mockResolvedValue(1);

      await service.resendInvite('inv-1', 'actor');
      expect(prismaMock.$executeRaw).toHaveBeenCalled();
    });
  });
});
