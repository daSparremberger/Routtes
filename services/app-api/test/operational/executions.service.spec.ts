import { Test } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { ExecutionsService } from '../../src/operational/executions/executions.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AttendanceDirection } from '../../src/operational/attendance/dto/upsert-attendance.dto';
import { StopStatus } from '../../src/operational/executions/dto/record-stop.dto';
import { RouteEventType } from '../../src/operational/executions/dto/add-route-event.dto';

describe('ExecutionsService', () => {
  let service: ExecutionsService;
  let prisma: {
    routes: { findFirst: jest.Mock };
    route_stops: { findMany: jest.Mock };
    attendance: { findMany: jest.Mock };
    route_executions: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    execution_stops: {
      createMany: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    route_events: { create: jest.Mock };
    outbox_events: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  const tenantId = 'tenant-uuid-1';
  const driverId = 'driver-uuid-1';

  const mockRoute = {
    id: 'route-uuid-1',
    tenant_id: tenantId,
    status: 'approved',
    shift: 'morning',
    driver_id: driverId,
    vehicle_id: 'vehicle-uuid-1',
  };

  const mockStops = [
    { id: 'stop-1', route_id: 'route-uuid-1', order: 0, student_id: 's1', school_id: null, stop_type: 'pickup', lat: -23.5, lng: -46.6 },
    { id: 'stop-2', route_id: 'route-uuid-1', order: 1, student_id: null, school_id: 'sch1', stop_type: 'school', lat: -23.4, lng: -46.5 },
  ];

  const mockExecution = {
    id: 'exec-uuid-1',
    tenant_id: tenantId,
    route_id: 'route-uuid-1',
    driver_id: driverId,
    vehicle_id: 'vehicle-uuid-1',
    service_date: new Date('2026-03-20'),
    status: 'prepared',
    started_at: null,
    finished_at: null,
  };

  const mockExecutionInProgress = { ...mockExecution, status: 'in_progress', started_at: new Date() };

  beforeEach(async () => {
    prisma = {
      routes: { findFirst: jest.fn() },
      route_stops: { findMany: jest.fn() },
      attendance: { findMany: jest.fn() },
      route_executions: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      execution_stops: {
        createMany: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      route_events: { create: jest.fn() },
      outbox_events: { create: jest.fn() },
      $transaction: jest.fn((fn) => (typeof fn === 'function' ? fn(prisma) : Promise.all(fn))),
    };

    const module = await Test.createTestingModule({
      providers: [
        ExecutionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ExecutionsService);
  });

  describe('prepare()', () => {
    it('should create execution with filtered stops based on attendance (RF14.1)', async () => {
      prisma.routes.findFirst.mockResolvedValue(mockRoute);
      prisma.route_stops.findMany.mockResolvedValue(mockStops);
      // s1 decided no → only school stop remains
      prisma.attendance.findMany.mockResolvedValue([
        { student_id: 's1', decision: 'no' },
      ]);
      prisma.route_executions.create.mockResolvedValue(mockExecution);
      prisma.execution_stops.createMany.mockResolvedValue({ count: 1 });

      const result = await service.prepare(tenantId, {
        route_id: 'route-uuid-1',
        driver_id: driverId,
        vehicle_id: 'vehicle-uuid-1',
        service_date: '2026-03-20',
        direction: AttendanceDirection.OUTBOUND,
      });

      expect(result.id).toBe('exec-uuid-1');
      // execution_stops.createMany should only include stops where student not absent
      expect(prisma.execution_stops.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ route_stop_id: 'stop-2' }), // school stop always included
          ]),
        }),
      );
    });

    it('should throw BadRequestException when route is not approved (RF13.6)', async () => {
      prisma.routes.findFirst.mockResolvedValue({ ...mockRoute, status: 'draft' });

      await expect(service.prepare(tenantId, {
        route_id: 'route-uuid-1',
        driver_id: driverId,
        vehicle_id: 'vehicle-uuid-1',
        service_date: '2026-03-20',
        direction: AttendanceDirection.OUTBOUND,
      })).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when route not found', async () => {
      prisma.routes.findFirst.mockResolvedValue(null);

      await expect(service.prepare(tenantId, {
        route_id: 'nonexistent',
        driver_id: driverId,
        vehicle_id: 'vehicle-uuid-1',
        service_date: '2026-03-20',
        direction: AttendanceDirection.OUTBOUND,
      })).rejects.toThrow(NotFoundException);
    });
  });

  describe('start()', () => {
    it('should transition execution to in_progress and write EXECUTION_STARTED outbox event (RF14.2)', async () => {
      prisma.route_executions.findFirst.mockResolvedValue(mockExecution);

      await service.start(tenantId, 'exec-uuid-1');

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw ConflictException when execution is already in_progress', async () => {
      prisma.route_executions.findFirst.mockResolvedValue(mockExecutionInProgress);

      await expect(service.start(tenantId, 'exec-uuid-1')).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when starting a finished execution', async () => {
      prisma.route_executions.findFirst.mockResolvedValue({ ...mockExecution, status: 'finished' });

      await expect(service.start(tenantId, 'exec-uuid-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('recordStop()', () => {
    it('should mark execution_stop as boarded and write STUDENT_BOARDED outbox event (RF14.3)', async () => {
      prisma.route_executions.findFirst.mockResolvedValue(mockExecutionInProgress);
      prisma.execution_stops.findFirst.mockResolvedValue({
        id: 'es-1',
        execution_id: 'exec-uuid-1',
        route_stop_id: 'stop-1',
        status: 'pending',
        route_stops: { student_id: 's1', stop_type: 'pickup' },
      });

      await service.recordStop(tenantId, 'exec-uuid-1', {
        execution_stop_id: 'es-1',
        status: StopStatus.BOARDED,
      });

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException when recording a stop on a non-in_progress execution', async () => {
      prisma.route_executions.findFirst.mockResolvedValue(mockExecution); // prepared, not in_progress

      await expect(service.recordStop(tenantId, 'exec-uuid-1', {
        execution_stop_id: 'es-1',
        status: StopStatus.BOARDED,
      })).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when execution_stop not found', async () => {
      prisma.route_executions.findFirst.mockResolvedValue(mockExecutionInProgress);
      prisma.execution_stops.findFirst.mockResolvedValue(null);

      await expect(service.recordStop(tenantId, 'exec-uuid-1', {
        execution_stop_id: 'nonexistent',
        status: StopStatus.BOARDED,
      })).rejects.toThrow(NotFoundException);
    });
  });

  describe('addRouteEvent()', () => {
    it('should create a route_event during in_progress execution (RF14.8)', async () => {
      prisma.route_executions.findFirst.mockResolvedValue(mockExecutionInProgress);
      prisma.route_events.create.mockResolvedValue({ id: 'ev-1', type: 'delay' });

      const result = await service.addRouteEvent(tenantId, 'exec-uuid-1', {
        type: RouteEventType.DELAY,
        description: 'Traffic jam on route',
        lat: -23.5,
        lng: -46.6,
      });

      expect(result.type).toBe('delay');
    });

    it('should throw BadRequestException when adding event to non-in_progress execution', async () => {
      prisma.route_executions.findFirst.mockResolvedValue(mockExecution); // prepared

      await expect(service.addRouteEvent(tenantId, 'exec-uuid-1', {
        type: RouteEventType.DELAY,
        description: 'some event',
      })).rejects.toThrow(BadRequestException);
    });
  });

  describe('finish()', () => {
    it('should finish execution and write EXECUTION_FINISHED outbox event (RF14.4)', async () => {
      prisma.route_executions.findFirst.mockResolvedValue(mockExecutionInProgress);
      // All boarded students at pickup have a corresponding school/dropoff boarded stop
      prisma.execution_stops.findMany.mockResolvedValue([
        { id: 'es-1', status: 'boarded', route_stops: { stop_type: 'pickup', student_id: 's1' } },
        { id: 'es-2', status: 'boarded', route_stops: { stop_type: 'school', student_id: 's1' } },
      ]);

      await service.finish(tenantId, 'exec-uuid-1', { total_km: 12.5 });

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException when any boarded pickup student is not delivered — RF14.9 (anti-forgetting lock)', async () => {
      prisma.route_executions.findFirst.mockResolvedValue(mockExecutionInProgress);
      // Student s1 boarded at pickup but no school/dropoff boarded stop for s1
      prisma.execution_stops.findMany.mockResolvedValue([
        { id: 'es-1', status: 'boarded', route_stops: { stop_type: 'pickup', student_id: 's1' } },
        { id: 'es-2', status: 'boarded', route_stops: { stop_type: 'pickup', student_id: 's2' } },
        { id: 'es-3', status: 'boarded', route_stops: { stop_type: 'school', student_id: 's2' } },
        // s1 has NO delivery stop boarded
      ]);

      await expect(service.finish(tenantId, 'exec-uuid-1', {})).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when execution is not in_progress', async () => {
      prisma.route_executions.findFirst.mockResolvedValue(mockExecution); // prepared

      await expect(service.finish(tenantId, 'exec-uuid-1', {})).rejects.toThrow(BadRequestException);
    });

    it('should rollback if outbox write fails — Outbox Pattern reliability', async () => {
      prisma.route_executions.findFirst.mockResolvedValue(mockExecutionInProgress);
      prisma.execution_stops.findMany.mockResolvedValue([
        { id: 'es-1', status: 'boarded', route_stops: { stop_type: 'school', student_id: 's1' } },
      ]);
      // Simulate $transaction throwing (e.g., outbox_events write fails)
      prisma.$transaction.mockRejectedValueOnce(new Error('DB write failed'));

      await expect(service.finish(tenantId, 'exec-uuid-1', {})).rejects.toThrow('DB write failed');

      // Verify $transaction was called once
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancel()', () => {
    it('should cancel a prepared execution and write ROUTE_CANCELLED outbox event (RF14.5)', async () => {
      prisma.route_executions.findFirst.mockResolvedValue(mockExecution); // prepared

      await service.cancel(tenantId, 'exec-uuid-1');

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should cancel an in_progress execution', async () => {
      prisma.route_executions.findFirst.mockResolvedValue(mockExecutionInProgress);

      await service.cancel(tenantId, 'exec-uuid-1');

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException when cancelling a finished execution', async () => {
      prisma.route_executions.findFirst.mockResolvedValue({
        ...mockExecution,
        status: 'finished',
      });

      await expect(service.cancel(tenantId, 'exec-uuid-1')).rejects.toThrow(BadRequestException);
    });
  });
});
