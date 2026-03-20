import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { LicensesService } from '../licenses/licenses.service';
import { AuditService } from '../../shared/audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';

const prismaMock = {
  contracts: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  organizations: {
    findUnique: jest.fn(),
  },
  tenants: {
    update: jest.fn(),
  },
  invoices: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};
// Wire $transaction to call the callback with prismaMock as the tx argument
(prismaMock.$transaction as jest.Mock).mockImplementation((fn: (tx: unknown) => unknown) =>
  fn(prismaMock),
);

const licensesMock = { syncFromContract: jest.fn() };
const auditMock = { log: jest.fn() };

const mockOrg = {
  id: 'org-1',
  tenant_id: 'tenant-1',
  razao_social: 'Test Org',
  cnpj: '00.000.000/0001-00',
  financial_email: 'test@test.com',
};

const mockContract = {
  id: 'contract-1',
  organization_id: 'org-1',
  monthly_value: 1000,
  modules: [],
  max_vehicles: 10,
  max_drivers: 5,
  max_managers: 2,
  starts_at: new Date('2026-01-01'),
  ends_at: null,
  status: 'active',
  created_at: new Date(),
  organizations: mockOrg,
};

describe('ContractsService', () => {
  let service: ContractsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ContractsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: LicensesService, useValue: licensesMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();
    service = module.get<ContractsService>(ContractsService);
  });

  describe('create', () => {
    it('should throw BadRequestException if active contract exists', async () => {
      prismaMock.contracts.findFirst.mockResolvedValue(mockContract);
      await expect(
        service.create(
          {
            organizationId: 'org-1',
            monthlyValue: 1000,
            maxVehicles: 10,
            maxDrivers: 5,
            maxManagers: 2,
            startsAt: '2026-01-01',
          },
          'actor-1',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.contracts.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organization_id: 'org-1', status: 'active' } }),
      );
    });

    it('should create contract, invoice, sync license, and log audit on success', async () => {
      prismaMock.contracts.findFirst.mockResolvedValue(null);
      prismaMock.organizations.findUnique.mockResolvedValue(mockOrg);
      prismaMock.contracts.create.mockResolvedValue(mockContract);
      prismaMock.invoices.create.mockResolvedValue({ id: 'inv-1' });
      licensesMock.syncFromContract.mockResolvedValue({});
      auditMock.log.mockResolvedValue(undefined);

      const dto = {
        organizationId: 'org-1',
        monthlyValue: 1000,
        maxVehicles: 10,
        maxDrivers: 5,
        maxManagers: 2,
        startsAt: '2026-01-01',
      };

      const result = await service.create(dto, 'actor-1');

      expect(prismaMock.contracts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organization_id: 'org-1',
            monthly_value: 1000,
            max_vehicles: 10,
            max_drivers: 5,
            max_managers: 2,
          }),
        }),
      );
      expect(prismaMock.invoices.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contract_id: mockContract.id,
            value: 1000,
            status: 'pending',
          }),
        }),
      );
      expect(licensesMock.syncFromContract).toHaveBeenCalledWith('tenant-1', {
        id: mockContract.id,
        maxVehicles: 10,
        maxDrivers: 5,
        maxManagers: 2,
      });
      expect(auditMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'contract.created' }),
      );
      expect(result).toEqual(mockContract);
    });
  });

  describe('updateStatus', () => {
    it('should suspend tenant when status is suspended', async () => {
      prismaMock.contracts.findUnique.mockResolvedValue(mockContract);
      prismaMock.tenants.update.mockResolvedValue({ id: 'tenant-1', status: 'suspended' });
      prismaMock.contracts.update.mockResolvedValue({ ...mockContract, status: 'suspended' });

      await service.updateStatus('contract-1', { status: 'suspended' }, 'actor-1');

      expect(prismaMock.tenants.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tenant-1' },
          data: expect.objectContaining({ status: 'suspended' }),
        }),
      );
      expect(prismaMock.contracts.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'contract-1' }, data: { status: 'suspended' } }),
      );
      expect(auditMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'contract.suspended' }),
      );
    });

    it('should set tenant inactive when status is terminated', async () => {
      prismaMock.contracts.findUnique.mockResolvedValue(mockContract);
      prismaMock.tenants.update.mockResolvedValue({ id: 'tenant-1', status: 'inactive' });
      prismaMock.contracts.update.mockResolvedValue({ ...mockContract, status: 'terminated' });

      await service.updateStatus('contract-1', { status: 'terminated' }, 'actor-1');

      expect(prismaMock.tenants.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tenant-1' },
          data: expect.objectContaining({ status: 'inactive' }),
        }),
      );
      expect(prismaMock.contracts.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'contract-1' }, data: { status: 'terminated' } }),
      );
      expect(auditMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'contract.terminated' }),
      );
    });
  });
});
