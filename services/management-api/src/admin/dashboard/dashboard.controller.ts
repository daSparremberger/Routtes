import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@routtes/shared';
import { DashboardService } from './dashboard.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN)
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get()
  getKpis() {
    return this.service.getKpis();
  }

  @Get('commercial')
  getCommercialKpis() {
    return this.service.getCommercialKpis();
  }

  @Get('tenant-usage')
  getTenantUsage() {
    return this.service.getTenantUsage();
  }
}
