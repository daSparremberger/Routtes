import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { TenantId } from '../../auth/decorators/tenant-id.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtPayload } from '@routtes/shared';
import { ExecutionsService } from './executions.service';
import { PrepareExecutionDto } from './dto/prepare-execution.dto';
import { RecordStopDto } from './dto/record-stop.dto';
import { AddRouteEventDto } from './dto/add-route-event.dto';
import { FinishExecutionDto } from './dto/finish-execution.dto';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('executions')
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  // RF14.1 — Prepare execution
  @Post('prepare')
  prepare(@TenantId() tenantId: string, @Body() dto: PrepareExecutionDto) {
    return this.executionsService.prepare(tenantId, dto);
  }

  // RF14.2 — Start execution
  @Post(':id/start')
  start(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.executionsService.start(tenantId, id);
  }

  // RF14.3 — Record stop event
  @Post(':id/stops')
  recordStop(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: RecordStopDto,
  ) {
    return this.executionsService.recordStop(tenantId, id, dto);
  }

  // RF14.8 — Add route event (delay, detour, mechanical...)
  @Post(':id/events')
  addRouteEvent(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: AddRouteEventDto,
  ) {
    return this.executionsService.addRouteEvent(tenantId, id, dto);
  }

  // RF14.4 + RF14.9 — Finish with anti-forgetting check
  @Post(':id/finish')
  finish(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: FinishExecutionDto,
  ) {
    return this.executionsService.finish(tenantId, id, dto);
  }

  // RF14.5 — Cancel execution
  @Post(':id/cancel')
  cancel(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.executionsService.cancel(tenantId, id);
  }

  // RF14.6 — Get active execution for current driver
  @Get('active')
  findActive(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.executionsService.findActive(tenantId, user.sub);
  }

  // RF14.7 — Get execution by route + date
  @Get('by-route')
  findByRouteAndDate(
    @TenantId() tenantId: string,
    @Query('routeId') routeId: string,
    @Query('serviceDate') serviceDate: string,
  ) {
    return this.executionsService.findByRouteAndDate(tenantId, routeId, serviceDate);
  }
}
