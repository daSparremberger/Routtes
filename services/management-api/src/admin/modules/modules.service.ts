import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import { UpsertModuleDto } from './dto/upsert-module.dto';
import { SetTenantModulesDto } from './dto/set-tenant-modules.dto';

@Injectable()
export class ModulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listModules() {
    return this.prisma.modules.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async upsertModule(dto: UpsertModuleDto) {
    return this.prisma.modules.upsert({
      where: { id: dto.id },
      update: {
        name: dto.name,
        dependencies: dto.dependencies ?? [],
        dependency_type: dto.dependencyType as 'required' | 'exclusive_group' | undefined ?? null,
      },
      create: {
        id: dto.id,
        name: dto.name,
        dependencies: dto.dependencies ?? [],
        dependency_type: dto.dependencyType as 'required' | 'exclusive_group' | undefined ?? null,
      },
    });
  }

  async setTenantModules(tenantId: string, dto: SetTenantModulesDto, actorId: string) {
    const allModules = await this.prisma.modules.findMany();

    // Validate required dependencies
    for (const moduleId of dto.moduleIds) {
      const mod = allModules.find((m) => m.id === moduleId);
      if (!mod) continue;
      if (mod.dependency_type === 'required' && mod.dependencies.length > 0) {
        const missing = mod.dependencies.filter((dep) => !dto.moduleIds.includes(dep));
        if (missing.length > 0) {
          throw new BadRequestException(
            `Module "${moduleId}" requires dependencies: ${missing.join(', ')}`,
          );
        }
      }
    }

    // Delete all existing tenant_modules for tenant
    await this.prisma.tenant_modules.deleteMany({
      where: { tenant_id: tenantId },
    });

    // Upsert each module as enabled
    if (dto.moduleIds.length > 0) {
      await this.prisma.tenant_modules.createMany({
        data: dto.moduleIds.map((moduleId) => ({
          tenant_id: tenantId,
          module_id: moduleId,
          enabled: true,
          updated_at: new Date(),
        })),
      });
    }

    await this.audit.log({
      actorId,
      action: 'tenant.modules_updated',
      resourceType: 'tenant_modules',
      resourceId: tenantId,
      tenantId,
      metadata: { moduleIds: dto.moduleIds },
    });

    return this.getTenantModules(tenantId);
  }

  async getTenantModules(tenantId: string) {
    return this.prisma.tenant_modules.findMany({
      where: { tenant_id: tenantId },
      include: { modules: true },
    });
  }
}
