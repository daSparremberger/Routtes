import { Injectable, NotFoundException } from '@nestjs/common';
import { stringify } from 'csv-stringify/sync';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { CreateGuardianDto } from './dto/create-guardian.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { shift_type, user_status } from '../../generated/prisma';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateStudentDto) {
    return this.prisma.students.create({
      data: {
        tenant_id: tenantId,
        name: dto.name,
        school_id: dto.school_id,
        shift: dto.shift as shift_type,
        class_name: dto.class_name ?? null,
        special_needs: dto.special_needs ?? null,
        monthly_value: dto.monthly_value ?? null,
        contract_start: dto.contract_start ? new Date(dto.contract_start) : null,
        status: 'active' as user_status,
      },
    });
  }

  async findAll(tenantId: string, schoolId?: string) {
    return this.prisma.students.findMany({
      where: {
        tenant_id: tenantId,
        status: 'active' as user_status,
        ...(schoolId ? { school_id: schoolId } : {}),
      },
      include: {
        student_guardians: true,
        student_addresses: true,
        schools: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const student = await this.prisma.students.findFirst({
      where: { id, tenant_id: tenantId, status: 'active' as user_status },
      include: {
        student_guardians: true,
        student_addresses: true,
        schools: { select: { name: true } },
      },
    });
    if (!student) throw new NotFoundException(`Student ${id} not found`);
    return student;
  }

  async update(tenantId: string, id: string, dto: UpdateStudentDto) {
    await this.findOne(tenantId, id);
    return this.prisma.students.update({
      where: { id, tenant_id: tenantId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.school_id !== undefined && { school_id: dto.school_id }),
        ...(dto.shift !== undefined && { shift: dto.shift as shift_type }),
        ...(dto.class_name !== undefined && { class_name: dto.class_name }),
        ...(dto.special_needs !== undefined && { special_needs: dto.special_needs }),
        ...(dto.monthly_value !== undefined && { monthly_value: dto.monthly_value }),
        ...(dto.contract_start !== undefined && {
          contract_start: new Date(dto.contract_start),
        }),
        ...(dto.status !== undefined && { status: dto.status as user_status }),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.students.update({
      where: { id, tenant_id: tenantId },
      data: { status: 'inactive' as user_status },
    });
  }

  async addGuardian(tenantId: string, studentId: string, dto: CreateGuardianDto) {
    await this.findOne(tenantId, studentId);
    return this.prisma.student_guardians.create({
      data: {
        student_id: studentId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email ?? null,
        is_primary: dto.is_primary ?? false,
      },
    });
  }

  async removeGuardian(tenantId: string, studentId: string, guardianId: string) {
    await this.findOne(tenantId, studentId);
    return this.prisma.student_guardians.deleteMany({
      where: { id: guardianId, student_id: studentId },
    });
  }

  async addAddress(tenantId: string, studentId: string, dto: CreateAddressDto) {
    await this.findOne(tenantId, studentId);
    return this.prisma.student_addresses.create({
      data: {
        student_id: studentId,
        address: dto.address,
        lat: dto.lat,
        lng: dto.lng,
      },
    });
  }

  async removeAddress(tenantId: string, studentId: string, addressId: string) {
    await this.findOne(tenantId, studentId);
    return this.prisma.student_addresses.deleteMany({
      where: { id: addressId, student_id: studentId },
    });
  }

  async exportCsv(tenantId: string): Promise<string> {
    const students = await this.findAll(tenantId);
    const rows = students.map((s: any) => ({
      id: s.id,
      name: s.name,
      school: s.schools?.name ?? '',
      shift: s.shift,
      class_name: s.class_name ?? '',
      status: s.status,
      guardian_name: s.student_guardians?.find((g: any) => g.is_primary)?.name ?? '',
      guardian_phone: s.student_guardians?.find((g: any) => g.is_primary)?.phone ?? '',
      guardian_email: s.student_guardians?.find((g: any) => g.is_primary)?.email ?? '',
    }));
    return stringify(rows, { header: true });
  }
}
