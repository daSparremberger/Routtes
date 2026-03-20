import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AttendanceService } from '../../src/operational/attendance/attendance.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AttendanceDirection, AttendanceDecision, AttendanceSource } from '../../src/operational/attendance/dto/upsert-attendance.dto';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prisma: {
    attendance: { upsert: jest.Mock; findMany: jest.Mock };
    routes: { findFirst: jest.Mock };
    students: { findFirst: jest.Mock };
  };

  const tenantId = 'tenant-uuid-1';
  const userId = 'manager-uuid-1';

  beforeEach(async () => {
    prisma = {
      attendance: { upsert: jest.fn(), findMany: jest.fn() },
      routes: { findFirst: jest.fn().mockResolvedValue({ id: 'r1', tenant_id: tenantId }) },
      students: { findFirst: jest.fn().mockResolvedValue({ id: 's1', tenant_id: tenantId }) },
    };

    const module = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(AttendanceService);
  });

  it('should upsert attendance decision (create or update — RF15.5)', async () => {
    prisma.attendance.upsert.mockResolvedValue({
      id: 'att-1',
      student_id: 'student-1',
      route_id: 'route-1',
      service_date: new Date('2026-03-20'),
      direction: 'outbound',
      decision: 'yes',
      source: 'manager',
    });

    const result = await service.upsert(tenantId, userId, {
      student_id: 'student-1',
      route_id: 'route-1',
      service_date: '2026-03-20',
      direction: AttendanceDirection.OUTBOUND,
      decision: AttendanceDecision.YES,
      source: AttendanceSource.MANAGER,
    });

    expect(result.decision).toBe('yes');
    expect(prisma.attendance.upsert).toHaveBeenCalled();
  });

  it('should query attendance by route, date and direction', async () => {
    prisma.attendance.findMany.mockResolvedValue([
      { student_id: 's1', decision: 'yes', direction: 'outbound' },
      { student_id: 's2', decision: 'no', direction: 'outbound' },
    ]);

    const result = await service.findByRoute(tenantId, 'route-1', '2026-03-20', 'outbound');

    expect(result).toHaveLength(2);
    expect(prisma.attendance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenant_id: tenantId,
          route_id: 'route-1',
          direction: 'outbound',
        }),
      }),
    );
  });

  it('should set override_by only when source is MANAGER (RF15.5 — manual override traceability)', async () => {
    prisma.attendance.upsert.mockResolvedValue({ id: 'att-1', override_by: userId });

    await service.upsert(tenantId, userId, {
      student_id: 's1',
      route_id: 'r1',
      service_date: '2026-03-20',
      direction: AttendanceDirection.OUTBOUND,
      decision: AttendanceDecision.NO,
      source: AttendanceSource.MANAGER,
    });

    expect(prisma.attendance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ override_by: userId }),
      }),
    );
  });

  it('should NOT set override_by when source is GUARDIAN (initial decision, not override)', async () => {
    prisma.attendance.upsert.mockResolvedValue({ id: 'att-1', override_by: null });

    await service.upsert(tenantId, userId, {
      student_id: 's1',
      route_id: 'r1',
      service_date: '2026-03-20',
      direction: AttendanceDirection.OUTBOUND,
      decision: AttendanceDecision.YES,
      source: AttendanceSource.GUARDIAN,
    });

    expect(prisma.attendance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ override_by: null }),
      }),
    );
  });

  it('should throw NotFoundException when route not found', async () => {
    prisma.routes.findFirst.mockResolvedValue(null);

    await expect(service.upsert(tenantId, userId, {
      student_id: 's1',
      route_id: 'nonexistent-route',
      service_date: '2026-03-20',
      direction: AttendanceDirection.OUTBOUND,
      decision: AttendanceDecision.YES,
      source: AttendanceSource.MANAGER,
    })).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException when student not found', async () => {
    prisma.students.findFirst.mockResolvedValue(null);

    await expect(service.upsert(tenantId, userId, {
      student_id: 'nonexistent-student',
      route_id: 'r1',
      service_date: '2026-03-20',
      direction: AttendanceDirection.OUTBOUND,
      decision: AttendanceDecision.YES,
      source: AttendanceSource.MANAGER,
    })).rejects.toThrow(NotFoundException);
  });
});
