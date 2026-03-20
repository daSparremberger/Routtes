import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { TenantId } from '../../auth/decorators/tenant-id.decorator';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { CreateGuardianDto } from './dto/create-guardian.dto';
import { CreateAddressDto } from './dto/create-address.dto';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateStudentDto) {
    return this.studentsService.create(tenantId, dto);
  }

  @Get()
  findAll(@TenantId() tenantId: string, @Query('schoolId') schoolId?: string) {
    return this.studentsService.findAll(tenantId, schoolId);
  }

  @Get('export/csv')
  async exportCsv(@TenantId() tenantId: string, @Res() res: Response) {
    const csv = await this.studentsService.exportCsv(tenantId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="students.csv"');
    res.send(csv);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.studentsService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.studentsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.studentsService.remove(tenantId, id);
  }

  @Post(':id/guardians')
  addGuardian(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateGuardianDto,
  ) {
    return this.studentsService.addGuardian(tenantId, id, dto);
  }

  @Delete(':id/guardians/:guardianId')
  removeGuardian(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('guardianId') guardianId: string,
  ) {
    return this.studentsService.removeGuardian(tenantId, id, guardianId);
  }

  @Post(':id/addresses')
  addAddress(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.studentsService.addAddress(tenantId, id, dto);
  }

  @Delete(':id/addresses/:addressId')
  removeAddress(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('addressId') addressId: string,
  ) {
    return this.studentsService.removeAddress(tenantId, id, addressId);
  }
}
