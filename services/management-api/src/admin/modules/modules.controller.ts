import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ModulesService } from './modules.service';
import { UpsertModuleDto } from './dto/upsert-module.dto';
import { SetTenantModulesDto } from './dto/set-tenant-modules.dto';
import { JwtPayload, UserRole } from '@routtes/shared';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN)
@Controller('admin')
export class ModulesController {
  constructor(private readonly service: ModulesService) {}

  @Get('modules')
  listModules() {
    return this.service.listModules();
  }

  @Post('modules')
  upsertModule(@Body() dto: UpsertModuleDto) {
    return this.service.upsertModule(dto);
  }

  @Get('tenants/:tenantId/modules')
  getTenantModules(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.service.getTenantModules(tenantId);
  }

  @Put('tenants/:tenantId/modules')
  setTenantModules(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: SetTenantModulesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.setTenantModules(tenantId, dto, user.sub);
  }
}
