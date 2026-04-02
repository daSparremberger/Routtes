import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { TenantId } from '../../auth/decorators/tenant-id.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtPayload } from '@routtes/shared';
import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { CreateStopDto } from './dto/create-stop.dto';
import { OptimizeRouteDto } from './dto/optimize-route.dto';
import { PaginateDto } from '../../shared/dto/paginate.dto';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateRouteDto) {
    return this.routesService.create(tenantId, dto);
  }

  @Get()
  findAll(@TenantId() tenantId: string, @Query('shift') shift?: string) {
    return this.routesService.findAll(tenantId, shift);
  }

  @Get('paginated')
  findAllPaginated(
    @TenantId() tenantId: string,
    @Query() query: PaginateDto & { shift?: string },
  ) {
    return this.routesService.findAllPaginated(tenantId, query.shift, query.page, query.limit);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.routesService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateRouteDto) {
    return this.routesService.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.routesService.remove(tenantId, id);
  }

  // Stops
  @Post(':id/stops')
  addStop(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: CreateStopDto) {
    return this.routesService.addStop(tenantId, id, dto);
  }

  @Delete(':id/stops/:stopId')
  removeStop(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('stopId') stopId: string,
  ) {
    return this.routesService.removeStop(tenantId, id, stopId);
  }

  // Optimization
  @Post(':id/optimize')
  optimize(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: OptimizeRouteDto,
  ) {
    return this.routesService.optimize(tenantId, id, user.sub, dto.criteria as any);
  }

  // Approval
  @Post(':id/approve')
  approve(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.routesService.approve(tenantId, id, user.sub);
  }
}
