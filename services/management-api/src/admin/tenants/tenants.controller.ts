import {
  Body, Controller, Get, Param, ParseUUIDPipe,
  Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { JwtPayload, UserRole } from '@routtes/shared';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN)
@Controller('admin/tenants')
export class TenantsController {
  constructor(private readonly service: TenantsService) {}

  @Post()
  create(@Body() dto: CreateTenantDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user.sub);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user.sub);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.service.deactivate(id, user.sub);
  }

  @Patch(':id/activate')
  activate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.service.activate(id, user.sub);
  }

  @Get(':id/audit-logs')
  getAuditLogs(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.service.getAuditLogs(id, +page, +limit);
  }
}
