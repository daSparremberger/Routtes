import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { TenantId } from '../../auth/decorators/tenant-id.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtPayload } from '@routtes/shared';
import { AttendanceService } from './attendance.service';
import { UpsertAttendanceDto } from './dto/upsert-attendance.dto';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  upsert(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload, @Body() dto: UpsertAttendanceDto) {
    return this.attendanceService.upsert(tenantId, user.sub, dto);
  }

  @Get()
  findByRoute(
    @TenantId() tenantId: string,
    @Query('routeId') routeId: string,
    @Query('serviceDate') serviceDate: string,
    @Query('direction') direction?: string,
  ) {
    return this.attendanceService.findByRoute(tenantId, routeId, serviceDate, direction);
  }
}
