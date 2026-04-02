import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { TenantId } from '../../auth/decorators/tenant-id.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtPayload } from '@routtes/shared';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { PaginateDto } from '../../shared/dto/paginate.dto';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateDriverDto) {
    return this.driversService.create(tenantId, dto);
  }

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.driversService.findAll(tenantId);
  }

  @Get('export/csv')
  async exportCsv(@TenantId() tenantId: string, @Res() res: Response) {
    const csv = await this.driversService.exportCsv(tenantId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="drivers.csv"');
    res.send(csv);
  }

  @Get('paginated')
  findAllPaginated(@TenantId() tenantId: string, @Query() query: PaginateDto) {
    return this.driversService.findAllPaginated(tenantId, query.page, query.limit);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.driversService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateDriverDto) {
    return this.driversService.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.driversService.remove(tenantId, id);
  }

  @Post(':id/invite')
  generateInvite(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.driversService.generateInvite(tenantId, user.sub, id);
  }

  @Post(':id/invite/resend')
  resendInvite(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.driversService.resendInvite(tenantId, user.sub, id);
  }
}
