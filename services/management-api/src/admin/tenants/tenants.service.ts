import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateTenantDto, actorId: string) {
    try {
      const tenant = await this.prisma.tenants.create({
        data: { city: dto.city, state: dto.state, status: 'active' },
      });
      await this.audit.log({
        actorId,
        action: 'tenant.created',
        resourceType: 'tenant',
        resourceId: tenant.id,
        metadata: { city: dto.city, state: dto.state },
      });
      return tenant;
    } catch (err) {
      if (err.code === 'P2002') {
        throw new ConflictException(`Tenant for ${dto.city}/${dto.state} already exists`);
      }
      throw err;
    }
  }

  async findAll() {
    return this.prisma.tenants.findMany({ orderBy: { created_at: 'desc' } });
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenants.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException(`Tenant ${id} not found`);
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto, actorId: string) {
    const before = await this.findOne(id);
    const tenant = await this.prisma.tenants.update({ where: { id }, data: dto });
    await this.audit.log({
      actorId,
      action: 'tenant.updated',
      resourceType: 'tenant',
      resourceId: id,
      metadata: { before, after: dto },
    });
    return tenant;
  }

  async deactivate(id: string, actorId: string) {
    await this.findOne(id);
    const tenant = await this.prisma.tenants.update({ where: { id }, data: { status: 'inactive' } });
    await this.audit.log({ actorId, action: 'tenant.deactivated', resourceType: 'tenant', resourceId: id });
    return tenant;
  }

  async activate(id: string, actorId: string) {
    await this.findOne(id);
    const tenant = await this.prisma.tenants.update({ where: { id }, data: { status: 'active' } });
    await this.audit.log({ actorId, action: 'tenant.activated', resourceType: 'tenant', resourceId: id });
    return tenant;
  }

  async getAuditLogs(tenantId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.audit_logs.findMany({ where: { tenant_id: tenantId }, orderBy: { created_at: 'desc' }, skip, take: limit }),
      this.prisma.audit_logs.count({ where: { tenant_id: tenantId } }),
    ]);
    return { data: logs, total, page, limit };
  }
}
