import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { TenantId } from '../../auth/decorators/tenant-id.decorator';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { AssignDriverDto } from './dto/assign-driver.dto';
import { PaginateDto } from '../../shared/dto/paginate.dto';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(tenantId, dto);
  }

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.vehiclesService.findAll(tenantId);
  }

  @Get('paginated')
  findAllPaginated(@TenantId() tenantId: string, @Query() query: PaginateDto) {
    return this.vehiclesService.findAllPaginated(tenantId, query.page, query.limit);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.vehiclesService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.vehiclesService.remove(tenantId, id);
  }

  @Post(':id/drivers')
  assignDriver(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: AssignDriverDto,
  ) {
    return this.vehiclesService.assignDriver(tenantId, id, dto.driver_user_id);
  }

  @Delete(':id/drivers/:driverUserId')
  removeDriver(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('driverUserId') driverUserId: string,
  ) {
    return this.vehiclesService.removeDriver(tenantId, id, driverUserId);
  }
}
