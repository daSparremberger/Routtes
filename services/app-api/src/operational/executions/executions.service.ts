import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PrepareExecutionDto } from './dto/prepare-execution.dto';
import { RecordStopDto, StopStatus } from './dto/record-stop.dto';
import { AddRouteEventDto } from './dto/add-route-event.dto';
import { FinishExecutionDto } from './dto/finish-execution.dto';

@Injectable()
export class ExecutionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── helpers ────────────────────────────────────────────────────────────────

  private async findExecution(tenantId: string, id: string) {
    const exec = await this.prisma.route_executions.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!exec) throw new NotFoundException(`Execution ${id} not found`);
    return exec;
  }

  private async writeOutbox(
    tx: any,
    aggregateId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    return tx.outbox_events.create({
      data: {
        aggregate_type: 'route_execution',
        aggregate_id: aggregateId,
        event_type: eventType,
        payload,
        published: false,
      },
    });
  }

  // ─── prepare ────────────────────────────────────────────────────────────────

  async prepare(tenantId: string, dto: PrepareExecutionDto) {
    const route = await this.prisma.routes.findFirst({
      where: { id: dto.route_id, tenant_id: tenantId },
    });
    if (!route) throw new NotFoundException(`Route ${dto.route_id} not found`);
    if (route.status !== 'approved') {
      throw new BadRequestException('Only approved routes can be executed');
    }

    const stops = await this.prisma.route_stops.findMany({
      where: { route_id: dto.route_id },
      orderBy: { order: 'asc' },
    });

    // Get attendance decisions to filter out absent students
    const attendanceList = await this.prisma.attendance.findMany({
      where: {
        tenant_id: tenantId,
        route_id: dto.route_id,
        service_date: new Date(dto.service_date),
        direction: dto.direction,
        decision: 'no',
      },
    });
    const absentStudentIds = new Set(attendanceList.map((a: any) => a.student_id));

    // School stops always included; student stops excluded if absent
    const qualifyingStops = stops.filter(
      (s: any) => !s.student_id || !absentStudentIds.has(s.student_id),
    );

    const execution = await this.prisma.route_executions.create({
      data: {
        tenant_id: tenantId,
        route_id: dto.route_id,
        driver_id: dto.driver_id,
        vehicle_id: dto.vehicle_id,
        service_date: new Date(dto.service_date),
        status: 'prepared',
      },
    });

    await this.prisma.execution_stops.createMany({
      data: qualifyingStops.map((s: any, idx: number) => ({
        execution_id: execution.id,
        route_stop_id: s.id,
        order: idx,
        status: 'pending',
      })),
    });

    return execution;
  }

  // ─── start ──────────────────────────────────────────────────────────────────

  async start(tenantId: string, executionId: string) {
    const exec = await this.findExecution(tenantId, executionId);

    if (exec.status === 'in_progress') {
      throw new ConflictException('Execution is already in progress');
    }
    if (exec.status !== 'prepared') {
      throw new BadRequestException(`Cannot start execution with status: ${exec.status}`);
    }

    return this.prisma.$transaction(async (tx: any) => {
      const updated = await tx.route_executions.update({
        where: { id: executionId },
        data: { status: 'in_progress', started_at: new Date() },
      });
      await this.writeOutbox(tx, executionId, 'EXECUTION_STARTED', {
        tenantId,
        routeId: exec.route_id,
        driverId: exec.driver_id,
        vehicleId: exec.vehicle_id,
        serviceDate: exec.service_date,
      });
      return updated;
    });
  }

  // ─── recordStop ─────────────────────────────────────────────────────────────

  async recordStop(tenantId: string, executionId: string, dto: RecordStopDto) {
    const exec = await this.findExecution(tenantId, executionId);

    if (exec.status !== 'in_progress') {
      throw new BadRequestException('Can only record stops on in_progress executions');
    }

    const executionStop = await this.prisma.execution_stops.findFirst({
      where: { id: dto.execution_stop_id, execution_id: executionId },
      include: { route_stops: true },
    });
    if (!executionStop) throw new NotFoundException(`Execution stop ${dto.execution_stop_id} not found`);

    return this.prisma.$transaction(async (tx: any) => {
      const updated = await tx.execution_stops.update({
        where: { id: dto.execution_stop_id },
        data: { status: dto.status, recorded_at: new Date() },
      });

      if (dto.status === StopStatus.BOARDED && (executionStop as any).route_stops?.student_id) {
        await this.writeOutbox(tx, executionId, 'STUDENT_BOARDED', {
          tenantId,
          executionId,
          studentId: (executionStop as any).route_stops.student_id,
          stopId: dto.execution_stop_id,
          recordedAt: new Date(),
        });
      }

      return updated;
    });
  }

  // ─── addRouteEvent ──────────────────────────────────────────────────────────

  async addRouteEvent(tenantId: string, executionId: string, dto: AddRouteEventDto) {
    const exec = await this.findExecution(tenantId, executionId);

    if (exec.status !== 'in_progress') {
      throw new BadRequestException('Can only add events to in_progress executions');
    }

    return this.prisma.route_events.create({
      data: {
        execution_id: executionId,
        type: dto.type,
        description: dto.description,
        lat: dto.lat ?? null,
        lng: dto.lng ?? null,
        recorded_at: new Date(),
      },
    });
  }

  // ─── finish ─────────────────────────────────────────────────────────────────

  async finish(tenantId: string, executionId: string, dto: FinishExecutionDto) {
    const exec = await this.findExecution(tenantId, executionId);

    if (exec.status !== 'in_progress') {
      throw new BadRequestException('Can only finish in_progress executions');
    }

    // RF14.9 — Anti-forgetting lock: reject if any pickup-boarded student has no delivery
    await this.assertNoUndeliveredStudents(executionId);

    return this.prisma.$transaction(async (tx: any) => {
      const updated = await tx.route_executions.update({
        where: { id: executionId },
        data: {
          status: 'finished',
          finished_at: new Date(),
          total_km: dto.total_km ?? null,
        },
      });
      await this.writeOutbox(tx, executionId, 'EXECUTION_FINISHED', {
        tenantId,
        executionId,
        finishedAt: new Date(),
        totalKm: dto.total_km,
      });
      return updated;
    });
  }

  /**
   * RF14.9 — Trava anti-esquecimento.
   * Checks that every student who boarded at a pickup stop also has
   * a boarded record at a school/dropoff stop (i.e., was delivered).
   * Throws BadRequestException listing undelivered student IDs.
   */
  private async assertNoUndeliveredStudents(executionId: string) {
    const allStops = await this.prisma.execution_stops.findMany({
      where: { execution_id: executionId },
      include: { route_stops: true },
      orderBy: { order: 'asc' },
    });

    // Students who boarded at pickup stops
    const boardedAtPickup = allStops
      .filter(
        (s: any) =>
          s.status === 'boarded' && s.route_stops?.stop_type === 'pickup' && s.route_stops?.student_id,
      )
      .map((s: any) => s.route_stops.student_id as string);

    // Students who boarded at school/dropoff stops (delivered)
    const deliveredStudentIds = new Set(
      allStops
        .filter(
          (s: any) =>
            s.status === 'boarded' &&
            ['school', 'dropoff'].includes(s.route_stops?.stop_type) &&
            s.route_stops?.student_id,
        )
        .map((s: any) => s.route_stops.student_id as string),
    );

    const undelivered = boardedAtPickup.filter((id) => !deliveredStudentIds.has(id));

    if (undelivered.length > 0) {
      throw new BadRequestException(
        `Cannot finish route: ${undelivered.length} student(s) boarded but not delivered. ` +
          `Student IDs: ${undelivered.join(', ')}`,
      );
    }
  }

  // ─── cancel ─────────────────────────────────────────────────────────────────

  async cancel(tenantId: string, executionId: string) {
    const exec = await this.findExecution(tenantId, executionId);

    if (!['prepared', 'in_progress'].includes(exec.status)) {
      throw new BadRequestException(`Cannot cancel execution with status: ${exec.status}`);
    }

    return this.prisma.$transaction(async (tx: any) => {
      const updated = await tx.route_executions.update({
        where: { id: executionId },
        data: { status: 'cancelled', finished_at: new Date() },
      });
      await this.writeOutbox(tx, executionId, 'ROUTE_CANCELLED', {
        tenantId,
        executionId,
        cancelledAt: new Date(),
      });
      return updated;
    });
  }

  // ─── queries ────────────────────────────────────────────────────────────────

  async findActive(tenantId: string, driverId: string) {
    return this.prisma.route_executions.findFirst({
      where: { tenant_id: tenantId, driver_id: driverId, status: 'in_progress' },
      include: {
        execution_stops: {
          orderBy: { order: 'asc' },
          include: { route_stops: true },
        },
        route_events: { orderBy: { recorded_at: 'asc' } },
      },
    });
  }

  async findByRouteAndDate(tenantId: string, routeId: string, serviceDate: string) {
    return this.prisma.route_executions.findFirst({
      where: {
        tenant_id: tenantId,
        route_id: routeId,
        service_date: new Date(serviceDate),
      },
      include: {
        execution_stops: { orderBy: { order: 'asc' }, include: { route_stops: true } },
      },
    });
  }
}
