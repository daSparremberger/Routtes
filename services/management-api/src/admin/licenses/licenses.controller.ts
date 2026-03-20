import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { LicensesService } from './licenses.service';
import { UpdateLicenseDto } from './dto/update-license.dto';
import { JwtPayload, UserRole } from '@routtes/shared';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN)
@Controller('admin/tenants/:tenantId/license')
export class LicensesController {
  constructor(private readonly service: LicensesService) {}

  @Get()
  getLicense(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.service.getLicense(tenantId);
  }

  @Get('usage')
  getUsage(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.service.getUsage(tenantId);
  }

  @Patch()
  updateManual(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: UpdateLicenseDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateManual(tenantId, dto, user.sub);
  }
}
