import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import { SyncLicenseDto } from './dto/sync-license.dto';
import { UpdateLicenseDto } from './dto/update-license.dto';

@Injectable()
export class LicensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findByTenant(tenantId: string) {
    const license = await this.prisma.licenses.findUnique({
      where: { tenant_id: tenantId },
    });
    if (!license) throw new NotFoundException(`License for tenant ${tenantId} not found`);
    return license;
  }

  async getUsage(tenantId: string) {
    const license = await this.findByTenant(tenantId);
    // TODO(RF02): real-time counts require cross-service query from app-api
    return {
      vehicles: { current: 0, max: license.max_vehicles },
      drivers: { current: 0, max: license.max_drivers },
      managers: { current: 0, max: license.max_managers },
    };
  }

  async updateManual(tenantId: string, dto: UpdateLicenseDto, actorId: string) {
    await this.findByTenant(tenantId);

    const updateData: Parameters<typeof this.prisma.licenses.update>[0]['data'] = {};
    if (dto.maxVehicles !== undefined) updateData.max_vehicles = dto.maxVehicles;
    if (dto.maxDrivers !== undefined) updateData.max_drivers = dto.maxDrivers;
    if (dto.maxManagers !== undefined) updateData.max_managers = dto.maxManagers;
    updateData.updated_at = new Date();

    const license = await this.prisma.licenses.update({
      where: { tenant_id: tenantId },
      data: updateData,
    });

    await this.audit.log({
      actorId,
      action: 'license.updated',
      resourceType: 'license',
      resourceId: license.id,
      tenantId,
      metadata: { ...dto },
    });

    return license;
  }

  async syncFromContract(dto: SyncLicenseDto, actorId: string) {
    const existing = await this.prisma.licenses.findUnique({
      where: { tenant_id: dto.tenantId },
    });

    if (existing) {
      const license = await this.prisma.licenses.update({
        where: { tenant_id: dto.tenantId },
        data: {
          max_vehicles: dto.maxVehicles,
          max_drivers: dto.maxDrivers,
          max_managers: dto.maxManagers,
          synced_from_contract_id: dto.contractId ?? null,
          updated_at: new Date(),
        },
      });

      await this.audit.log({
        actorId,
        action: 'license.synced',
        resourceType: 'license',
        resourceId: license.id,
        tenantId: dto.tenantId,
        metadata: { ...dto },
      });

      return license;
    }

    const license = await this.prisma.licenses.create({
      data: {
        tenant_id: dto.tenantId,
        max_vehicles: dto.maxVehicles,
        max_drivers: dto.maxDrivers,
        max_managers: dto.maxManagers,
        synced_from_contract_id: dto.contractId ?? null,
        updated_at: new Date(),
      },
    });

    await this.audit.log({
      actorId,
      action: 'license.created',
      resourceType: 'license',
      resourceId: license.id,
      tenantId: dto.tenantId,
      metadata: { ...dto },
    });

    return license;
  }
}
