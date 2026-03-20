import { Test } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('VehiclesService', () => {
  let service: VehiclesService;
  let prisma: {
    vehicles: { create: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock; update: jest.Mock; count: jest.Mock };
    vehicle_drivers: { create: jest.Mock; delete: jest.Mock; findMany: jest.Mock };
    $queryRaw: jest.Mock;
  };

  const tenantId = 'tenant-uuid-1';

  const mockVehicle = {
    id: 'vehicle-uuid-1',
    tenant_id: tenantId,
    plate: 'ABC1D23',
    capacity: 15,
    model: 'Sprinter',
    status: 'active',
    created_at: new Date(),
  };

  const mockLicense = [{ max_vehicles: 5 }];

  beforeEach(async () => {
    prisma = {
      vehicles: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      vehicle_drivers: { create: jest.fn(), delete: jest.fn(), findMany: jest.fn() },
      $queryRaw: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        VehiclesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(VehiclesService);
  });

  it('should create a vehicle when under license limit', async () => {
    prisma.$queryRaw.mockResolvedValue(mockLicense);
    prisma.vehicles.count.mockResolvedValue(3);
    prisma.vehicles.create.mockResolvedValue(mockVehicle);

    const result = await service.create(tenantId, {
      plate: 'ABC1D23',
      capacity: 15,
    });

    expect(result.id).toBe('vehicle-uuid-1');
  });

  it('should throw BadRequestException when license limit is reached (RF11.3)', async () => {
    prisma.$queryRaw.mockResolvedValue([{ max_vehicles: 3 }]);
    prisma.vehicles.count.mockResolvedValue(3);

    await expect(
      service.create(tenantId, { plate: 'XYZ9999', capacity: 10 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should list vehicles filtered by tenant', async () => {
    prisma.vehicles.findMany.mockResolvedValue([mockVehicle]);

    const result = await service.findAll(tenantId);

    expect(result).toHaveLength(1);
    expect(prisma.vehicles.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenant_id: tenantId }) }),
    );
  });

  it('should throw NotFoundException when vehicle not found', async () => {
    prisma.vehicles.findFirst.mockResolvedValue(null);

    await expect(service.findOne(tenantId, 'nonexistent')).rejects.toThrow(NotFoundException);
  });

  it('should assign a driver to a vehicle (M:N)', async () => {
    prisma.vehicles.findFirst.mockResolvedValue(mockVehicle);
    prisma.vehicle_drivers.create.mockResolvedValue({
      vehicle_id: 'vehicle-uuid-1',
      driver_user_id: 'driver-uuid-1',
      assigned_at: new Date(),
    });

    const result = await service.assignDriver(tenantId, 'vehicle-uuid-1', 'driver-uuid-1');

    expect(result.driver_user_id).toBe('driver-uuid-1');
  });

  it('should inactivate vehicle without deleting (RF11.5)', async () => {
    prisma.vehicles.findFirst.mockResolvedValue(mockVehicle);
    prisma.vehicles.update.mockResolvedValue({ ...mockVehicle, status: 'inactive' });

    const result = await service.remove(tenantId, 'vehicle-uuid-1');

    expect(result.status).toBe('inactive');
    expect(prisma.vehicles.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'inactive' } }),
    );
  });
});
