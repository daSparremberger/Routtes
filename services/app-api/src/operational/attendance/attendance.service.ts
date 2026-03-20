import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertAttendanceDto } from './dto/upsert-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(tenantId: string, userId: string, dto: UpsertAttendanceDto) {
    const serviceDate = new Date(dto.service_date);

    // Validate that route and student belong to the tenant
    const route = await this.prisma.routes.findFirst({
      where: { id: dto.route_id, tenant_id: tenantId },
    });
    if (!route) throw new NotFoundException(`Route ${dto.route_id} not found`);

    const student = await this.prisma.students.findFirst({
      where: { id: dto.student_id, tenant_id: tenantId },
    });
    if (!student) throw new NotFoundException(`Student ${dto.student_id} not found`);

    // override_by is only set for manual manager overrides (RF15.5 traceability)
    const isManualOverride = dto.source === 'manager';

    return this.prisma.attendance.upsert({
      where: {
        student_id_route_id_service_date_direction: {
          student_id: dto.student_id,
          route_id: dto.route_id,
          service_date: serviceDate,
          direction: dto.direction,
        },
      },
      create: {
        tenant_id: tenantId,
        student_id: dto.student_id,
        route_id: dto.route_id,
        service_date: serviceDate,
        direction: dto.direction,
        decision: dto.decision,
        source: dto.source,
        override_by: isManualOverride ? userId : null,
      },
      update: {
        decision: dto.decision,
        source: dto.source,
        override_by: isManualOverride ? userId : null,
      },
    });
  }

  async findByRoute(
    tenantId: string,
    routeId: string,
    serviceDate: string,
    direction?: string,
  ) {
    return this.prisma.attendance.findMany({
      where: {
        tenant_id: tenantId,
        route_id: routeId,
        service_date: new Date(serviceDate),
        ...(direction ? { direction } : {}),
      },
    });
  }
}
