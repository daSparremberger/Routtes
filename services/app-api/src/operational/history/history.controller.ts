import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { TenantId } from '../../auth/decorators/tenant-id.decorator';
import { HistoryService } from './history.service';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('driverId') driverId?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('routeId') routeId?: string,
  ) {
    return this.historyService.findAll(tenantId, {
      startDate,
      endDate,
      driverId,
      vehicleId,
      routeId,
    });
  }
}
