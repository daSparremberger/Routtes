import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { TenantId } from '../../auth/decorators/tenant-id.decorator';
import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { CreateContactDto } from './dto/create-contact.dto';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateSchoolDto) {
    return this.schoolsService.create(tenantId, dto);
  }

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.schoolsService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.schoolsService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateSchoolDto) {
    return this.schoolsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.schoolsService.remove(tenantId, id);
  }

  @Post(':id/schedules')
  addSchedule(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateScheduleDto,
  ) {
    return this.schoolsService.addSchedule(tenantId, id, dto);
  }

  @Delete(':id/schedules/:scheduleId')
  removeSchedule(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('scheduleId') scheduleId: string,
  ) {
    return this.schoolsService.removeSchedule(tenantId, id, scheduleId);
  }

  @Post(':id/contacts')
  addContact(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateContactDto,
  ) {
    return this.schoolsService.addContact(tenantId, id, dto);
  }

  @Delete(':id/contacts/:contactId')
  removeContact(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('contactId') contactId: string,
  ) {
    return this.schoolsService.removeContact(tenantId, id, contactId);
  }
}
