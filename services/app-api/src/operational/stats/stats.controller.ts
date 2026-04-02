import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { TenantId } from '../../auth/decorators/tenant-id.decorator';
import { StatsService } from './stats.service';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  getStats(@TenantId() tenantId: string) {
    return this.statsService.getStats(tenantId);
  }
}
