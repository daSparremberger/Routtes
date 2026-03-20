import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LicensesService } from './licenses.service';
import { AuditService } from '../../shared/audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';

const prismaMock = {
  licenses: { findUnique: jest.fn(), update: jest.fn(), upsert: jest.fn() },
  contracts: { findFirst: jest.fn() },
};
const auditMock = { log: jest.fn() };

describe('LicensesService', () => {
  let service: LicensesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        LicensesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();
    service = module.get<LicensesService>(LicensesService);
  });

  describe('getLicense', () => {
    it('should return license for tenant', async () => {
      prismaMock.licenses.findUnique.mockResolvedValue({ tenant_id: 't1', max_vehicles: 10 });
      const result = await service.getLicense('t1');
      expect(result.max_vehicles).toBe(10);
    });

    it('should throw NotFoundException if license not found', async () => {
      prismaMock.licenses.findUnique.mockResolvedValue(null);
      await expect(service.getLicense('bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateManual', () => {
    it('should throw BadRequestException when active contract exists', async () => {
      prismaMock.licenses.findUnique.mockResolvedValue({ tenant_id: 't1' });
      prismaMock.contracts.findFirst.mockResolvedValue({ id: 'c1', status: 'active' });
      await expect(
        service.updateManual('t1', { maxVehicles: 20 }, 'actor'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update license when no active contract', async () => {
      prismaMock.licenses.findUnique.mockResolvedValue({ tenant_id: 't1', max_vehicles: 5, id: 'lic1' });
      prismaMock.contracts.findFirst.mockResolvedValue(null);
      prismaMock.licenses.update.mockResolvedValue({ tenant_id: 't1', max_vehicles: 20, id: 'lic1' });
      const result = await service.updateManual('t1', { maxVehicles: 20 }, 'actor');
      expect(result.max_vehicles).toBe(20);
      expect(auditMock.log).toHaveBeenCalled();
    });
  });

  describe('syncFromContract', () => {
    it('should upsert license from contract data', async () => {
      const contract = { id: 'c1', maxVehicles: 10, maxDrivers: 5, maxManagers: 2 };
      prismaMock.licenses.upsert.mockResolvedValue({ tenant_id: 't1', max_vehicles: 10 });
      await service.syncFromContract('t1', contract);
      expect(prismaMock.licenses.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenant_id: 't1' },
          update: expect.objectContaining({ max_vehicles: 10 }),
        }),
      );
    });
  });
});
