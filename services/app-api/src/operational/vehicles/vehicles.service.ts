import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { PaginatedResponse, paginate } from '../../shared/dto/paginate.dto';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  private async checkVehicleLimit(tenantId: string): Promise<void> {
    const licenseRows = await this.prisma.$queryRaw<{ max_vehicles: number }[]>`
      SELECT max_vehicles
      FROM management.licenses
      WHERE tenant_id = ${tenantId}::uuid
      LIMIT 1
    `;

    if (!licenseRows.length) return;

    const limit = licenseRows[0].max_vehicles;
    const current = await this.prisma.vehicles.count({
      where: { tenant_id: tenantId, status: 'active' },
    });

    if (current >= limit) {
      throw new BadRequestException(
        `Vehicle limit reached (${current}/${limit}). Upgrade your license to add more vehicles.`,
      );
    }
  }

  async create(tenantId: string, dto: CreateVehicleDto) {
    await this.checkVehicleLimit(tenantId);

    return this.prisma.vehicles.create({
      data: {
        tenant_id: tenantId,
        plate: dto.plate,
        capacity: dto.capacity,
        model: dto.model ?? null,
        totem_id: dto.totem_id ?? null,
        status: 'active',
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.vehicles.findMany({
      where: { tenant_id: tenantId },
      include: {
        vehicle_drivers: {
          include: {
            users: { select: { id: true, name: true, status: true } },
          },
        },
      },
      orderBy: { plate: 'asc' },
    });
  }

  async findAllPaginated(tenantId: string, page = 1, limit = 20): Promise<PaginatedResponse<any>> {
    const where = { tenant_id: tenantId };
    const { skip, take } = paginate(page, limit);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.vehicles.findMany({ where, orderBy: { plate: 'asc' }, skip, take }),
      this.prisma.vehicles.count({ where }),
    ]);
    return { data, total, page, limit, hasMore: page * limit < total };
  }

  async findOne(tenantId: string, id: string) {
    const vehicle = await this.prisma.vehicles.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        vehicle_drivers: {
          include: {
            users: { select: { id: true, name: true, status: true } },
          },
        },
      },
    });
    if (!vehicle) throw new NotFoundException(`Vehicle ${id} not found`);
    return vehicle;
  }

  async update(tenantId: string, id: string, dto: UpdateVehicleDto) {
    await this.findOne(tenantId, id);
    return this.prisma.vehicles.update({
      where: { id, tenant_id: tenantId },
      data: dto,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.vehicles.update({
      where: { id, tenant_id: tenantId },
      data: { status: 'inactive' },
    });
  }

  async assignDriver(tenantId: string, vehicleId: string, driverUserId: string) {
    await this.findOne(tenantId, vehicleId);
    return this.prisma.vehicle_drivers.create({
      data: {
        vehicle_id: vehicleId,
        driver_user_id: driverUserId,
        assigned_at: new Date(),
      },
    });
  }

  async removeDriver(tenantId: string, vehicleId: string, driverUserId: string) {
    await this.findOne(tenantId, vehicleId);
    return this.prisma.vehicle_drivers.delete({
      where: {
        vehicle_id_driver_user_id: {
          vehicle_id: vehicleId,
          driver_user_id: driverUserId,
        },
      },
    });
  }
}
