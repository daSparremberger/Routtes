import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { AuditService } from '../../shared/audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';

const prismaMock = {
  organizations: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  contracts: { findFirst: jest.fn() },
};
const auditMock = { log: jest.fn() };

describe('OrganizationsService', () => {
  let service: OrganizationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();
    service = module.get<OrganizationsService>(OrganizationsService);
  });

  describe('create', () => {
    it('should create org and log audit', async () => {
      const org = {
        id: 'org-1',
        tenant_id: 'tenant-1',
        razao_social: 'Test Org',
        cnpj: '12.345.678/0001-99',
        financial_email: 'finance@test.com',
        billing_address: null,
        created_at: new Date(),
        updated_at: new Date(),
        tenants: { id: 'tenant-1', city: 'São Paulo', state: 'SP' },
      };
      prismaMock.organizations.create.mockResolvedValue(org);

      const dto = {
        tenantId: 'tenant-1',
        razaoSocial: 'Test Org',
        cnpj: '12.345.678/0001-99',
        financialEmail: 'finance@test.com',
      };
      const result = await service.create(dto, 'actor-1');

      expect(result.razao_social).toBe('Test Org');
      expect(auditMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'organization.created' }),
      );
    });

    it('should throw ConflictException on P2002', async () => {
      const prismaError = { code: 'P2002' };
      prismaMock.organizations.create.mockRejectedValue(prismaError);

      const dto = {
        tenantId: 'tenant-1',
        razaoSocial: 'Test Org',
        cnpj: '12.345.678/0001-99',
        financialEmail: 'finance@test.com',
      };
      await expect(service.create(dto, 'actor-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if not found', async () => {
      prismaMock.organizations.findUnique.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate', () => {
    it('should throw BadRequestException when active contract exists', async () => {
      const org = {
        id: 'org-1',
        tenant_id: 'tenant-1',
        razao_social: 'Test Org',
        cnpj: '12.345.678/0001-99',
        financial_email: 'finance@test.com',
        billing_address: null,
        created_at: new Date(),
        updated_at: new Date(),
        tenants: { id: 'tenant-1', city: 'São Paulo', state: 'SP' },
      };
      prismaMock.organizations.findUnique.mockResolvedValue(org);
      prismaMock.contracts.findFirst.mockResolvedValue({ id: 'contract-1', status: 'active' });

      await expect(service.deactivate('org-1', 'actor-1')).rejects.toThrow(BadRequestException);
    });
  });
});
