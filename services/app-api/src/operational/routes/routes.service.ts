import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { shift_type } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { MapboxService, OptimizationCriteria } from './mapbox/mapbox.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { CreateStopDto } from './dto/create-stop.dto';

@Injectable()
export class RoutesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapbox: MapboxService,
  ) {}

  async create(tenantId: string, dto: CreateRouteDto) {
    return this.prisma.routes.create({
      data: {
        tenant_id: tenantId,
        name: dto.name,
        shift: dto.shift,
        driver_id: dto.driver_id,
        vehicle_id: dto.vehicle_id,
        route_type: dto.route_type ?? 'fixed',
        status: 'draft',
      },
    });
  }

  async findAll(tenantId: string, shift?: string) {
    return this.prisma.routes.findMany({
      where: {
        tenant_id: tenantId,
        ...(shift ? { shift: shift as shift_type } : {}),
      },
      include: {
        route_stops: { orderBy: { order: 'asc' } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const route = await this.prisma.routes.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        route_stops: { orderBy: { order: 'asc' } },
        route_optimizations: { orderBy: { created_at: 'desc' }, take: 5 },
      },
    });
    if (!route) throw new NotFoundException(`Route ${id} not found`);
    return route;
  }

  async update(tenantId: string, id: string, dto: UpdateRouteDto) {
    await this.findOne(tenantId, id);
    return this.prisma.routes.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.routes.update({ where: { id }, data: { status: 'inactive' } });
  }

  async addStop(tenantId: string, routeId: string, dto: CreateStopDto) {
    await this.findOne(tenantId, routeId);
    return this.prisma.route_stops.create({
      data: {
        route_id: routeId,
        order: dto.order,
        student_id: dto.student_id ?? null,
        school_id: dto.school_id ?? null,
        lat: dto.lat,
        lng: dto.lng,
        stop_type: dto.stop_type,
      },
    });
  }

  async removeStop(tenantId: string, routeId: string, stopId: string) {
    await this.findOne(tenantId, routeId);
    return this.prisma.route_stops.deleteMany({
      where: { id: stopId, route_id: routeId },
    });
  }

  async optimize(
    tenantId: string,
    routeId: string,
    userId: string,
    criteria: OptimizationCriteria,
  ) {
    await this.findOne(tenantId, routeId);

    const stops = await this.prisma.route_stops.findMany({
      where: { route_id: routeId },
      orderBy: { order: 'asc' },
    });

    if (stops.length < 2) {
      throw new BadRequestException('Route must have at least 2 stops to optimize');
    }

    const beforeOrder = stops.map((s) => ({ id: s.id, order: s.order }));

    const optimizedIndices = await this.mapbox.optimizeRoute(
      stops.map((s) => ({ lat: Number(s.lat), lng: Number(s.lng) })),
      criteria,
    );

    // Apply new order: optimizedIndices[newOrder] = originalIndex
    const updates = optimizedIndices.map((originalIdx, newOrder) =>
      this.prisma.route_stops.updateMany({
        where: { id: stops[originalIdx].id },
        data: { order: newOrder },
      }),
    );

    await this.prisma.$transaction(updates);

    const afterStops = await this.prisma.route_stops.findMany({
      where: { route_id: routeId },
      orderBy: { order: 'asc' },
    });

    await this.prisma.route_optimizations.create({
      data: {
        route_id: routeId,
        optimized_by: userId,
        criteria,
        stops_order_before: beforeOrder,
        stops_order_after: afterStops.map((s) => ({ id: s.id, order: s.order })),
      },
    });

    return afterStops;
  }

  async approve(tenantId: string, routeId: string, userId: string) {
    const route = await this.findOne(tenantId, routeId);

    if (route.status !== 'draft') {
      throw new BadRequestException(`Route is already ${route.status} — only draft routes can be approved`);
    }

    return this.prisma.routes.update({
      where: { id: routeId },
      data: { status: 'approved', approved_by: userId, approved_at: new Date() },
    });
  }
}
