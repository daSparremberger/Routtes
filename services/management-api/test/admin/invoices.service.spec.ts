import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { InvoicesService } from '../../src/admin/invoices/invoices.service';
import { AuditService } from '../../src/shared/audit/audit.service';
import { PrismaService } from '../../src/prisma/prisma.service';

const prismaMock = {
  invoices: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
  },
  contracts: { findMany: jest.fn() },
};
const auditMock = { log: jest.fn() };

describe('InvoicesService', () => {
  let service: InvoicesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();
    service = module.get<InvoicesService>(InvoicesService);
  });

  describe('create', () => {
    it('should throw ConflictException on duplicate competence month (P2002)', async () => {
      prismaMock.invoices.create.mockRejectedValue({ code: 'P2002' });
      await expect(
        service.create({ contractId: 'c1', competenceMonth: '2026-04-01', value: 500 }, 'actor'),
      ).rejects.toThrow(ConflictException);
    });

    it('should create invoice', async () => {
      prismaMock.invoices.create.mockResolvedValue({ id: 'inv1', status: 'pending' });
      const result = await service.create(
        { contractId: 'c1', competenceMonth: '2026-04-01', value: 500 },
        'actor',
      );
      expect(result.id).toBe('inv1');
    });
  });

  describe('bulkGenerate', () => {
    it('should generate invoices for all active contracts', async () => {
      prismaMock.contracts.findMany.mockResolvedValue([
        { id: 'c1', monthly_value: 500 },
        { id: 'c2', monthly_value: 300 },
      ]);
      prismaMock.invoices.findFirst.mockResolvedValue(null);
      prismaMock.invoices.create.mockResolvedValue({ id: 'inv1' });

      const result = await service.bulkGenerate({ competenceMonth: '2026-04-01' }, 'actor');
      expect(result.generated).toBe(2);
    });

    it('should skip contracts that already have invoice for competence month', async () => {
      prismaMock.contracts.findMany.mockResolvedValue([{ id: 'c1', monthly_value: 500 }]);
      prismaMock.invoices.findFirst.mockResolvedValue({ id: 'existing' });
      prismaMock.invoices.create.mockResolvedValue({ id: 'inv1' });

      const result = await service.bulkGenerate({ competenceMonth: '2026-04-01' }, 'actor');
      expect(result.generated).toBe(0);
      expect(result.skipped).toBe(1);
    });
  });

  describe('markPaid', () => {
    it('should mark invoice as paid', async () => {
      prismaMock.invoices.findUnique.mockResolvedValue({ id: 'inv1', status: 'pending' });
      prismaMock.invoices.update.mockResolvedValue({ id: 'inv1', status: 'paid' });

      await service.markPaid('inv1', 'actor');
      expect(prismaMock.invoices.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'paid', paid_by: 'actor' }),
        }),
      );
    });

    it('should throw NotFoundException if invoice not found', async () => {
      prismaMock.invoices.findUnique.mockResolvedValue(null);
      await expect(service.markPaid('bad-id', 'actor')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if invoice not found', async () => {
      prismaMock.invoices.findUnique.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });

    it('should return invoice', async () => {
      prismaMock.invoices.findUnique.mockResolvedValue({ id: 'inv1' });
      const result = await service.findOne('inv1');
      expect(result.id).toBe('inv1');
    });
  });

  describe('cancel', () => {
    it('should cancel invoice and call update with status cancelled', async () => {
      prismaMock.invoices.findUnique.mockResolvedValue({ id: 'inv1', status: 'pending' });
      prismaMock.invoices.update.mockResolvedValue({ id: 'inv1', status: 'cancelled' });

      await service.cancel('inv1', 'actor');
      expect(prismaMock.invoices.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv1' },
          data: expect.objectContaining({ status: 'cancelled' }),
        }),
      );
    });

    it('should throw NotFoundException when invoice is not found', async () => {
      prismaMock.invoices.findUnique.mockResolvedValue(null);
      await expect(service.cancel('inv1', 'actor')).rejects.toThrow(NotFoundException);
    });
  });
});
