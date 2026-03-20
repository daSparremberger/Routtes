import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ModulesService } from './modules.service';
import { AuditService } from '../../shared/audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';

const prismaMock = {
  modules: {
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
  tenant_modules: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
};

const auditMock = { log: jest.fn() };

describe('ModulesService', () => {
  let service: ModulesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ModulesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();

    service = module.get<ModulesService>(ModulesService);
  });

  describe('listModules', () => {
    it('returns all modules ordered by id asc', async () => {
      const modules = [
        { id: 'maps', name: 'Maps', dependencies: [], dependency_type: null },
        { id: 'routes', name: 'Routes', dependencies: ['maps'], dependency_type: 'required' },
      ];
      prismaMock.modules.findMany.mockResolvedValue(modules);

      const result = await service.listModules();

      expect(prismaMock.modules.findMany).toHaveBeenCalledWith({ orderBy: { id: 'asc' } });
      expect(result).toEqual(modules);
    });
  });

  describe('setTenantModules', () => {
    const tenantId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const actorId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    it('throws BadRequestException when required dependency is not in moduleIds', async () => {
      prismaMock.modules.findMany.mockResolvedValue([
        { id: 'maps', name: 'Maps', dependencies: [], dependency_type: null },
        {
          id: 'routes',
          name: 'Routes',
          dependencies: ['maps'],
          dependency_type: 'required',
        },
      ]);

      await expect(
        service.setTenantModules(tenantId, { moduleIds: ['routes'] }, actorId),
      ).rejects.toThrow(BadRequestException);

      expect(prismaMock.tenant_modules.deleteMany).not.toHaveBeenCalled();
    });

    it('enables modules when required dependencies are satisfied', async () => {
      prismaMock.modules.findMany.mockResolvedValue([
        { id: 'maps', name: 'Maps', dependencies: [], dependency_type: null },
        {
          id: 'routes',
          name: 'Routes',
          dependencies: ['maps'],
          dependency_type: 'required',
        },
      ]);

      prismaMock.tenant_modules.deleteMany.mockResolvedValue({ count: 0 });
      prismaMock.tenant_modules.createMany.mockResolvedValue({ count: 2 });
      prismaMock.tenant_modules.findMany.mockResolvedValue([
        { tenant_id: tenantId, module_id: 'maps', enabled: true, modules: { id: 'maps', name: 'Maps' } },
        { tenant_id: tenantId, module_id: 'routes', enabled: true, modules: { id: 'routes', name: 'Routes' } },
      ]);

      const result = await service.setTenantModules(
        tenantId,
        { moduleIds: ['maps', 'routes'] },
        actorId,
      );

      expect(prismaMock.tenant_modules.deleteMany).toHaveBeenCalledWith({
        where: { tenant_id: tenantId },
      });
      expect(prismaMock.tenant_modules.createMany).toHaveBeenCalled();
      expect(auditMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'tenant.modules_updated',
          tenantId,
          actorId,
        }),
      );
      expect(result).toHaveLength(2);
    });
  });
});
