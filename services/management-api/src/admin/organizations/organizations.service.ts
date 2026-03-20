import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateOrganizationDto, actorId: string) {
    try {
      const org = await this.prisma.organizations.create({
        data: {
          tenant_id: dto.tenantId,
          razao_social: dto.razaoSocial,
          cnpj: dto.cnpj,
          financial_email: dto.financialEmail,
          billing_address: (dto.billingAddress ?? undefined) as object | undefined,
        },
        include: { tenants: true },
      });

      await this.audit.log({
        actorId,
        action: 'organization.created',
        resourceType: 'organization',
        resourceId: org.id,
        tenantId: org.tenant_id,
        metadata: { razao_social: org.razao_social, cnpj: org.cnpj },
      });

      return org;
    } catch (err) {
      const e = err as { code?: string };
      if (e.code === 'P2002') {
        throw new ConflictException('Organization with this tenant or CNPJ already exists');
      }
      throw err;
    }
  }

  async findAll() {
    return this.prisma.organizations.findMany({
      include: { tenants: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const org = await this.prisma.organizations.findUnique({
      where: { id },
      include: { tenants: true },
    });
    if (!org) throw new NotFoundException(`Organization ${id} not found`);
    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto, actorId: string) {
    await this.findOne(id);

    const updateData: Parameters<typeof this.prisma.organizations.update>[0]['data'] = {};
    if (dto.razaoSocial !== undefined) updateData.razao_social = dto.razaoSocial;
    if (dto.cnpj !== undefined) updateData.cnpj = dto.cnpj;
    if (dto.financialEmail !== undefined) updateData.financial_email = dto.financialEmail;
    if (dto.billingAddress !== undefined) updateData.billing_address = dto.billingAddress as object;
    updateData.updated_at = new Date();

    const org = await this.prisma.organizations.update({
      where: { id },
      data: updateData,
      include: { tenants: true },
    });

    await this.audit.log({
      actorId,
      action: 'organization.updated',
      resourceType: 'organization',
      resourceId: org.id,
      tenantId: org.tenant_id,
      metadata: { ...dto },
    });

    return org;
  }

  async deactivate(id: string, actorId: string) {
    const org = await this.findOne(id);

    const activeContract = await this.prisma.contracts.findFirst({
      where: { organization_id: id, status: 'active' },
    });
    if (activeContract) {
      throw new BadRequestException(
        'Cannot deactivate organization while an active contract exists',
      );
    }

    await this.audit.log({
      actorId,
      action: 'organization.deactivated',
      resourceType: 'organization',
      resourceId: org.id,
      tenantId: org.tenant_id,
      metadata: {},
    });

    return org;
  }
}
