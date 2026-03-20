import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('DriversService', () => {
  let service: DriversService;
  let prisma: any;

  const tenantId = 'tenant-uuid-1';
  const currentUserId = 'manager-uuid-1';
  const mockDriver = {
    id: 'driver-uuid-1',
    tenant_id: tenantId,
    role: 'driver',
    name: 'Carlos Motorista',
    email: 'carlos@empresa.com',
    status: 'active',
    created_at: new Date(),
    driver_profiles: {
      user_id: 'driver-uuid-1',
      cnh: '12345678900',
      cnh_validity: new Date('2026-12-31'),
      cnh_category: 'D',
    },
  };

  beforeEach(async () => {
    prisma = {
      users: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      driver_profiles: {
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      invite_tokens: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    const module = await Test.createTestingModule({
      providers: [DriversService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(DriversService);
  });

  it('should list drivers filtered by tenant', async () => {
    prisma.users.findMany.mockResolvedValue([mockDriver]);
    const result = await service.findAll(tenantId);
    expect(result).toHaveLength(1);
    expect(prisma.users.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenant_id: tenantId, role: 'driver' }),
      }),
    );
  });

  it('should throw NotFoundException when driver not found', async () => {
    prisma.users.findFirst.mockResolvedValue(null);
    await expect(service.findOne(tenantId, 'nonexistent')).rejects.toThrow(NotFoundException);
  });

  it('should inactivate driver without deleting (RF10.6)', async () => {
    prisma.users.findFirst.mockResolvedValue(mockDriver);
    prisma.users.update.mockResolvedValue({ ...mockDriver, status: 'inactive' });
    const result = await service.remove(tenantId, 'driver-uuid-1');
    expect(result.status).toBe('inactive');
    expect(prisma.users.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'inactive' } }),
    );
  });

  it('should generate an invite token for a driver (RF20.1)', async () => {
    prisma.users.findFirst.mockResolvedValue(mockDriver);
    prisma.invite_tokens.create.mockResolvedValue({
      id: 'invite-uuid-1',
      token: 'abc123tok',
      role: 'driver',
      expires_at: new Date(),
    });
    const result = await service.generateInvite(tenantId, currentUserId, 'driver-uuid-1');
    expect(result.token).toBe('abc123tok');
    expect(prisma.invite_tokens.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: 'driver', tenant_id: tenantId }),
      }),
    );
  });

  it('should resend invite by invalidating old and creating new (RF10.3)', async () => {
    prisma.users.findFirst.mockResolvedValue(mockDriver);
    prisma.invite_tokens.findFirst.mockResolvedValue({
      id: 'old-invite',
      token: 'oldtok',
      role: 'driver',
      used_at: null,
    });
    prisma.invite_tokens.update.mockResolvedValue({});
    prisma.invite_tokens.create.mockResolvedValue({ id: 'new-invite', token: 'newtok' });
    const result = await service.resendInvite(tenantId, currentUserId, 'driver-uuid-1');
    expect(prisma.invite_tokens.update).toHaveBeenCalled();
    expect(result.token).toBe('newtok');
  });

  it('should export drivers as CSV', async () => {
    prisma.users.findMany.mockResolvedValue([mockDriver]);
    const csv = await service.exportCsv(tenantId);
    expect(typeof csv).toBe('string');
    expect(csv).toContain('Carlos Motorista');
  });
});
