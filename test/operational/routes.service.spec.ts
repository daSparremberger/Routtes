import { Test } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RoutesService } from '../../src/operational/routes/routes.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { MapboxService } from '../../src/operational/routes/mapbox/mapbox.service';
import { RouteShift, RouteType } from '../../src/operational/routes/dto/create-route.dto';
import { StopType } from '../../src/operational/routes/dto/create-stop.dto';

describe('RoutesService', () => {
  let service: RoutesService;
  let prisma: {
    routes: { create: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
    route_stops: { create: jest.Mock; findMany: jest.Mock; updateMany: jest.Mock; deleteMany: jest.Mock };
    route_optimizations: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let mapbox: jest.Mocked<MapboxService>;

  const tenantId = 'tenant-uuid-1';
  const managerId = 'manager-uuid-1';

  const mockRoute = {
    id: 'route-uuid-1',
    tenant_id: tenantId,
    name: 'Rota Manhã Centro',
    shift: 'morning',
    driver_id: 'driver-uuid-1',
    vehicle_id: 'vehicle-uuid-1',
    route_type: 'fixed',
    status: 'draft',
    approved_by: null,
    approved_at: null,
    created_at: new Date(),
  };

  const mockStops = [
    { id: 'stop-1', route_id: 'route-uuid-1', order: 0, lat: -23.5, lng: -46.6, stop_type: 'pickup', student_id: 's1', school_id: null },
    { id: 'stop-2', route_id: 'route-uuid-1', order: 1, lat: -23.6, lng: -46.7, stop_type: 'school', student_id: null, school_id: 'sch1' },
  ];

  beforeEach(async () => {
    prisma = {
      routes: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      route_stops: { create: jest.fn(), findMany: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn() },
      route_optimizations: { create: jest.fn() },
      $transaction: jest.fn((arr) => Promise.all(arr)),
    };

    const module = await Test.createTestingModule({
      providers: [
        RoutesService,
        { provide: PrismaService, useValue: prisma },
        { provide: MapboxService, useValue: { optimizeRoute: jest.fn() } },
      ],
    }).compile();

    service = module.get(RoutesService);
    mapbox = module.get(MapboxService);
  });

  it('should create a route scoped to tenant', async () => {
    prisma.routes.create.mockResolvedValue(mockRoute);

    const result = await service.create(tenantId, {
      name: 'Rota Manhã Centro',
      shift: RouteShift.MORNING,
      driver_id: 'driver-uuid-1',
      vehicle_id: 'vehicle-uuid-1',
      route_type: RouteType.FIXED,
    });

    expect(result.id).toBe('route-uuid-1');
    expect(prisma.routes.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tenant_id: tenantId, status: 'draft' }) }),
    );
  });

  it('should list routes filtered by tenant', async () => {
    prisma.routes.findMany.mockResolvedValue([mockRoute]);
    const result = await service.findAll(tenantId);
    expect(result).toHaveLength(1);
  });

  it('should throw NotFoundException when route not found', async () => {
    prisma.routes.findFirst.mockResolvedValue(null);
    await expect(service.findOne(tenantId, 'nonexistent')).rejects.toThrow(NotFoundException);
  });

  it('should add a stop to a route', async () => {
    prisma.routes.findFirst.mockResolvedValue(mockRoute);
    prisma.route_stops.create.mockResolvedValue(mockStops[0]);

    const result = await service.addStop(tenantId, 'route-uuid-1', {
      order: 0,
      student_id: 's1',
      lat: -23.5,
      lng: -46.6,
      stop_type: StopType.PICKUP,
    });

    expect(result.stop_type).toBe('pickup');
  });

  it('should optimize stop order via Mapbox and save history', async () => {
    prisma.routes.findFirst.mockResolvedValue(mockRoute);
    prisma.route_stops.findMany.mockResolvedValue(mockStops);
    mapbox.optimizeRoute.mockResolvedValue([1, 0]); // reversed order
    prisma.route_stops.updateMany.mockResolvedValue({ count: 2 });
    prisma.route_optimizations.create.mockResolvedValue({ id: 'opt-1' });

    await service.optimize(tenantId, 'route-uuid-1', managerId, 'distance');

    expect(mapbox.optimizeRoute).toHaveBeenCalled();
    expect(prisma.route_optimizations.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          route_id: 'route-uuid-1',
          optimized_by: managerId,
          criteria: 'distance',
        }),
      }),
    );
  });

  it('should approve a draft route (RF13.6)', async () => {
    prisma.routes.findFirst.mockResolvedValue(mockRoute);
    prisma.routes.update.mockResolvedValue({ ...mockRoute, status: 'approved', approved_by: managerId });

    const result = await service.approve(tenantId, 'route-uuid-1', managerId);

    expect(result.status).toBe('approved');
    expect(prisma.routes.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'approved', approved_by: managerId }),
      }),
    );
  });

  it('should throw BadRequestException when approving an already approved route', async () => {
    prisma.routes.findFirst.mockResolvedValue({ ...mockRoute, status: 'approved' });

    await expect(service.approve(tenantId, 'route-uuid-1', managerId)).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException when approving an active route', async () => {
    prisma.routes.findFirst.mockResolvedValue({ ...mockRoute, status: 'active' });

    await expect(service.approve(tenantId, 'route-uuid-1', managerId)).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException when approving an inactive route', async () => {
    prisma.routes.findFirst.mockResolvedValue({ ...mockRoute, status: 'inactive' });

    await expect(service.approve(tenantId, 'route-uuid-1', managerId)).rejects.toThrow(BadRequestException);
  });

  it('should set approved_by and approved_at atomically on approval', async () => {
    prisma.routes.findFirst.mockResolvedValue(mockRoute);
    prisma.routes.update.mockResolvedValue({
      ...mockRoute,
      status: 'approved',
      approved_by: managerId,
      approved_at: new Date(),
    });

    const result = await service.approve(tenantId, 'route-uuid-1', managerId);

    expect(result.approved_by).toBe(managerId);
    expect(result.approved_at).toBeDefined();
    expect(prisma.routes.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'approved',
          approved_by: managerId,
          approved_at: expect.any(Date),
        }),
      }),
    );
  });
});
