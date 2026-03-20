import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface HistoryFilters {
  startDate?: string;
  endDate?: string;
  driverId?: string;
  vehicleId?: string;
  routeId?: string;
}

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filters: HistoryFilters) {
    const where: any = {
      tenant_id: tenantId,
      status: 'finished',
    };

    if (filters.startDate) {
      where.service_date = { gte: new Date(filters.startDate) };
    }
    if (filters.endDate) {
      where.service_date = {
        ...where.service_date,
        lte: new Date(filters.endDate),
      };
    }
    if (filters.driverId) where.driver_id = filters.driverId;
    if (filters.vehicleId) where.vehicle_id = filters.vehicleId;
    if (filters.routeId) where.route_id = filters.routeId;

    const executions = await this.prisma.route_executions.findMany({
      where,
      include: {
        execution_stops: {
          include: { route_stops: { select: { stop_type: true, student_id: true } } },
        },
        routes: { select: { name: true, shift: true } },
      },
      orderBy: { service_date: 'desc' },
    });

    return executions.map((exec) => this.aggregate(exec));
  }

  private aggregate(exec: any) {
    const stops = exec.execution_stops ?? [];
    const boarded = stops.filter((s: any) => s.status === 'boarded' && s.route_stops?.student_id);
    const skipped = stops.filter((s: any) => s.status === 'skipped');
    const absent = stops.filter((s: any) => s.status === 'absent');

    const durationMs =
      exec.finished_at && exec.started_at
        ? new Date(exec.finished_at).getTime() - new Date(exec.started_at).getTime()
        : null;
    const durationMinutes = durationMs ? Math.round(durationMs / 60000) : null;

    return {
      id: exec.id,
      routeName: exec.routes?.name,
      shift: exec.routes?.shift,
      serviceDate: exec.service_date,
      driverId: exec.driver_id,
      vehicleId: exec.vehicle_id,
      startedAt: exec.started_at,
      finishedAt: exec.finished_at,
      durationMinutes,
      totalKm: exec.total_km,
      studentsBoarded: boarded.length,
      studentsSkipped: skipped.length,
      studentsAbsent: absent.length,
    };
  }
}
