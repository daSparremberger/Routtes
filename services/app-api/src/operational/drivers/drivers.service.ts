import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { stringify } from 'csv-stringify/sync';
import { user_role, user_status, invite_role } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { PaginatedResponse, paginate } from '../../shared/dto/paginate.dto';

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateDriverDto) {
    const user = await this.prisma.users.create({
      data: {
        tenant_id: tenantId,
        role: 'driver' as user_role,
        name: dto.name,
        email: dto.email,
        status: 'active' as user_status,
        firebase_uid: `pending_${randomBytes(8).toString('hex')}`,
      },
    });

    if (dto.cnh) {
      await this.prisma.driver_profiles.create({
        data: {
          user_id: user.id,
          cnh: dto.cnh,
          cnh_validity: dto.cnh_validity ? new Date(dto.cnh_validity) : new Date('9999-12-31'),
          cnh_category: dto.cnh_category ?? '',
        },
      });
    }

    return user;
  }

  async findAll(tenantId: string) {
    return this.prisma.users.findMany({
      where: { tenant_id: tenantId, role: 'driver' as user_role },
      include: { driver_profiles: true },
      orderBy: { name: 'asc' },
    });
  }

  async findAllPaginated(tenantId: string, page = 1, limit = 20): Promise<PaginatedResponse<any>> {
    const where = { tenant_id: tenantId, role: 'driver' as user_role };
    const { skip, take } = paginate(page, limit);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.users.findMany({
        where,
        include: { driver_profiles: true },
        orderBy: { name: 'asc' },
        skip,
        take,
      }),
      this.prisma.users.count({ where }),
    ]);
    return { data, total, page, limit, hasMore: page * limit < total };
  }

  async findOne(tenantId: string, id: string) {
    const driver = await this.prisma.users.findFirst({
      where: { id, tenant_id: tenantId, role: 'driver' as user_role },
      include: { driver_profiles: true },
    });
    if (!driver) throw new NotFoundException(`Driver ${id} not found`);
    return driver;
  }

  async update(tenantId: string, id: string, dto: UpdateDriverDto) {
    await this.findOne(tenantId, id);
    const { cnh, cnh_validity, cnh_category, ...userFields } = dto;

    const user = await this.prisma.users.update({
      where: { id, tenant_id: tenantId },
      data: {
        ...(userFields.name !== undefined && { name: userFields.name }),
        ...(userFields.email !== undefined && { email: userFields.email }),
        ...(userFields.status !== undefined && { status: userFields.status as user_status }),
      },
    });

    if (cnh !== undefined) {
      await this.prisma.driver_profiles.upsert({
        where: { user_id: id },
        create: {
          user_id: id,
          cnh,
          cnh_validity: cnh_validity ? new Date(cnh_validity) : new Date('9999-12-31'),
          cnh_category: cnh_category ?? '',
        },
        update: {
          cnh,
          ...(cnh_validity !== undefined && { cnh_validity: new Date(cnh_validity) }),
          ...(cnh_category !== undefined && { cnh_category }),
        },
      });
    }

    return user;
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.users.update({
      where: { id, tenant_id: tenantId },
      data: { status: 'inactive' as user_status },
    });
  }

  async generateInvite(tenantId: string, createdBy: string, driverUserId: string) {
    const driver = await this.findOne(tenantId, driverUserId);
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return this.prisma.invite_tokens.create({
      data: {
        tenant_id: tenantId,
        token,
        role: 'driver' as invite_role,
        expires_at: expiresAt,
        created_by: createdBy,
        email: driver.email,
      },
    });
  }

  async resendInvite(tenantId: string, createdBy: string, driverUserId: string) {
    const driver = await this.findOne(tenantId, driverUserId);

    const existing = await this.prisma.invite_tokens.findFirst({
      where: {
        tenant_id: tenantId,
        role: 'driver' as invite_role,
        used_at: null,
        email: driver.email,
      },
      orderBy: { expires_at: 'desc' },
    });

    if (existing) {
      await this.prisma.invite_tokens.update({
        where: { id: existing.id },
        data: { expires_at: new Date() },
      });
    }

    return this.generateInvite(tenantId, createdBy, driverUserId);
  }

  async exportCsv(tenantId: string): Promise<string> {
    const drivers = await this.findAll(tenantId);
    const rows = drivers.map((d: any) => ({
      id: d.id,
      name: d.name,
      email: d.email,
      status: d.status,
      cnh: d.driver_profiles?.cnh ?? '',
      cnh_category: d.driver_profiles?.cnh_category ?? '',
      cnh_validity: d.driver_profiles?.cnh_validity
        ? new Date(d.driver_profiles.cnh_validity).toISOString().split('T')[0]
        : '',
    }));
    return stringify(rows, { header: true });
  }
}
