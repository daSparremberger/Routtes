import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import { LicensesService } from '../licenses/licenses.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractStatusDto } from './dto/update-contract-status.dto';

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly licenses: LicensesService,
  ) {}

  async create(dto: CreateContractDto, actorId: string) {
    const existing = await this.prisma.contracts.findFirst({
      where: { organization_id: dto.organizationId, status: 'active' },
    });
    if (existing) {
      throw new BadRequestException(
        'Organization already has an active contract',
      );
    }

    const org = await this.prisma.organizations.findUnique({
      where: { id: dto.organizationId },
    });
    if (!org) {
      throw new NotFoundException(`Organization ${dto.organizationId} not found`);
    }

    const now = new Date();
    const competenceMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const contract = await this.prisma.$transaction(async (tx) => {
      const created = await tx.contracts.create({
        data: {
          organization_id: dto.organizationId,
          monthly_value: dto.monthlyValue,
          modules: dto.modules ?? [],
          max_vehicles: dto.maxVehicles,
          max_drivers: dto.maxDrivers,
          max_managers: dto.maxManagers,
          starts_at: new Date(dto.startsAt),
          ends_at: dto.endsAt ? new Date(dto.endsAt) : null,
          status: 'active',
        },
      });

      await tx.invoices.create({
        data: {
          contract_id: created.id,
          competence_month: competenceMonth,
          value: dto.monthlyValue,
          status: 'pending',
        },
      });

      return created;
    });

    await this.licenses.syncFromContract(org.tenant_id, {
      id: contract.id,
      maxVehicles: dto.maxVehicles,
      maxDrivers: dto.maxDrivers,
      maxManagers: dto.maxManagers,
    });

    await this.audit.log({
      actorId,
      action: 'contract.created',
      resourceType: 'contract',
      resourceId: contract.id,
      tenantId: org.tenant_id,
      metadata: { organizationId: dto.organizationId, monthlyValue: dto.monthlyValue },
    });

    return contract;
  }

  async findAll(orgId?: string) {
    return this.prisma.contracts.findMany({
      where: orgId ? { organization_id: orgId } : undefined,
      include: { organizations: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const contract = await this.prisma.contracts.findUnique({
      where: { id },
      include: { organizations: true },
    });
    if (!contract) throw new NotFoundException(`Contract ${id} not found`);
    return contract;
  }

  async updateStatus(id: string, dto: UpdateContractStatusDto, actorId: string) {
    const contract = await this.findOne(id);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.status === 'suspended') {
        await tx.tenants.update({
          where: { id: contract.organizations.tenant_id },
          data: { status: 'suspended', updated_at: new Date() },
        });
      } else if (dto.status === 'terminated') {
        await tx.tenants.update({
          where: { id: contract.organizations.tenant_id },
          data: { status: 'inactive', updated_at: new Date() },
        });
      }

      return tx.contracts.update({
        where: { id },
        data: { status: dto.status },
      });
    });

    await this.audit.log({
      actorId,
      action: `contract.${dto.status}`,
      resourceType: 'contract',
      resourceId: id,
      tenantId: contract.organizations.tenant_id,
      metadata: { previousStatus: contract.status, newStatus: dto.status },
    });

    return updated;
  }
}
