import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import { UpdateLicenseDto } from './dto/update-license.dto';

@Injectable()
export class LicensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getLicense(tenantId: string) {
    const license = await this.prisma.licenses.findUnique({
      where: { tenant_id: tenantId },
    });
    if (!license) throw new NotFoundException(`License for tenant ${tenantId} not found`);
    return license;
  }

  async getUsage(tenantId: string) {
    const license = await this.getLicense(tenantId);
    // TODO(RF02): real-time counts require cross-service query from app-api
    return {
      license,
      usage: {
        vehicles: { current: 0, max: license.max_vehicles },
        drivers: { current: 0, max: license.max_drivers },
        managers: { current: 0, max: license.max_managers },
      },
    };
  }

  async updateManual(tenantId: string, dto: UpdateLicenseDto, actorId: string) {
    await this.getLicense(tenantId);

    const activeContract = await this.prisma.contracts.findFirst({
      where: { organizations: { tenant_id: tenantId }, status: 'active' },
    });
    if (activeContract) {
      throw new BadRequestException(
        'Cannot manually update license while active contract exists',
      );
    }

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
      action: 'license.updated_manual',
      resourceType: 'license',
      resourceId: license.id,
      tenantId,
      metadata: { ...dto },
    });

    return license;
  }

  async syncFromContract(
    tenantId: string,
    contract: { id: string; maxVehicles: number; maxDrivers: number; maxManagers: number },
  ) {
    return this.prisma.licenses.upsert({
      where: { tenant_id: tenantId },
      update: {
        max_vehicles: contract.maxVehicles,
        max_drivers: contract.maxDrivers,
        max_managers: contract.maxManagers,
        synced_from_contract_id: contract.id,
        updated_at: new Date(),
      },
      create: {
        tenant_id: tenantId,
        max_vehicles: contract.maxVehicles,
        max_drivers: contract.maxDrivers,
        max_managers: contract.maxManagers,
        synced_from_contract_id: contract.id,
        updated_at: new Date(),
      },
    });
  }
}
