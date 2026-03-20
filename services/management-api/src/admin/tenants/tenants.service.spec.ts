import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { AuditService } from '../../shared/audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';

const prismaMock = {
  tenants: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  audit_logs: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

const auditMock = { log: jest.fn() };

describe('TenantsService', () => {
  let service: TenantsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();
    service = module.get<TenantsService>(TenantsService);
  });

  describe('create', () => {
    it('should create a tenant and log audit', async () => {
      const dto = { city: 'São Paulo', state: 'SP' };
      const actorId = 'actor-uuid';
      prismaMock.tenants.create.mockResolvedValue({ id: 'uuid-1', ...dto, status: 'active' });
      const result = await service.create(dto, actorId);
      expect(prismaMock.tenants.create).toHaveBeenCalledWith({
        data: { city: dto.city, state: dto.state, status: 'active' },
      });
      expect(auditMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'tenant.created', actorId }),
      );
      expect(result.city).toBe('São Paulo');
    });

    it('should throw ConflictException on duplicate city/state (P2002)', async () => {
      prismaMock.tenants.create.mockRejectedValue({ code: 'P2002' });
      await expect(service.create({ city: 'Rio', state: 'RJ' }, 'actor')).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return list of tenants', async () => {
      prismaMock.tenants.findMany.mockResolvedValue([{ id: 'uuid-1' }]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when tenant not found', async () => {
      prismaMock.tenants.findUnique.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update tenant and log audit', async () => {
      const existing = { id: 'uuid-1', city: 'SP', state: 'SP', status: 'active' };
      prismaMock.tenants.findUnique.mockResolvedValue(existing);
      prismaMock.tenants.update.mockResolvedValue({ ...existing, city: 'Santos' });
      const result = await service.update('uuid-1', { city: 'Santos' }, 'actor');
      expect(result.city).toBe('Santos');
      expect(auditMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'tenant.updated' }),
      );
    });
  });

  describe('deactivate', () => {
    it('should set status to inactive and log audit', async () => {
      prismaMock.tenants.findUnique.mockResolvedValue({ id: 'uuid-1', status: 'active' });
      prismaMock.tenants.update.mockResolvedValue({ id: 'uuid-1', status: 'inactive' });
      await service.deactivate('uuid-1', 'actor');
      expect(prismaMock.tenants.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'inactive' }) }),
      );
      expect(auditMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'tenant.deactivated' }),
      );
    });
  });

  describe('activate', () => {
    it('should set status to active and log audit', async () => {
      prismaMock.tenants.findUnique.mockResolvedValue({ id: 'uuid-1', status: 'inactive' });
      prismaMock.tenants.update.mockResolvedValue({ id: 'uuid-1', status: 'active' });
      await service.activate('uuid-1', 'actor');
      expect(prismaMock.tenants.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'active' }) }),
      );
      expect(auditMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'tenant.activated' }),
      );
    });
  });
});
