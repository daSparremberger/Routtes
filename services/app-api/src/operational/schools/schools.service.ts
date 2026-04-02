import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { school_type, shift_type, user_status } from '../../generated/prisma';
import { PaginatedResponse, paginate } from '../../shared/dto/paginate.dto';

function parseTime(hhmm: string): Date {
  const [hours, minutes] = hhmm.split(':').map(Number);
  const d = new Date(0);
  d.setUTCHours(hours, minutes, 0, 0);
  return d;
}

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateSchoolDto) {
    return this.prisma.schools.create({
      data: {
        tenant_id: tenantId,
        name: dto.name,
        address: dto.address,
        lat: dto.lat,
        lng: dto.lng,
        type: dto.type as school_type,
        status: 'active' as user_status,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.schools.findMany({
      where: { tenant_id: tenantId, status: 'active' as user_status },
      include: { school_schedules: true, school_contacts: true },
      orderBy: { name: 'asc' },
    });
  }

  async findAllPaginated(tenantId: string, page = 1, limit = 20): Promise<PaginatedResponse<any>> {
    const where = { tenant_id: tenantId, status: 'active' as any };
    const { skip, take } = paginate(page, limit);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.schools.findMany({
        where,
        include: {
          school_schedules: true,
          school_contacts: true,
        },
        orderBy: { name: 'asc' },
        skip,
        take,
      }),
      this.prisma.schools.count({ where }),
    ]);
    return { data, total, page, limit, hasMore: page * limit < total };
  }

  async findOne(tenantId: string, id: string) {
    const school = await this.prisma.schools.findFirst({
      where: { id, tenant_id: tenantId, status: 'active' as user_status },
      include: { school_schedules: true, school_contacts: true },
    });
    if (!school) throw new NotFoundException(`School ${id} not found`);
    return school;
  }

  async update(tenantId: string, id: string, dto: UpdateSchoolDto) {
    await this.findOne(tenantId, id);
    return this.prisma.schools.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.lat !== undefined && { lat: dto.lat }),
        ...(dto.lng !== undefined && { lng: dto.lng }),
        ...(dto.type !== undefined && { type: dto.type as school_type }),
        ...(dto.status !== undefined && { status: dto.status as user_status }),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.schools.update({
      where: { id },
      data: { status: 'inactive' as user_status },
    });
  }

  async addSchedule(tenantId: string, schoolId: string, dto: CreateScheduleDto) {
    await this.findOne(tenantId, schoolId);
    return this.prisma.school_schedules.create({
      data: {
        school_id: schoolId,
        shift: dto.shift as shift_type,
        entry_time: parseTime(dto.entry_time),
        exit_time: parseTime(dto.exit_time),
      },
    });
  }

  async removeSchedule(tenantId: string, schoolId: string, scheduleId: string) {
    await this.findOne(tenantId, schoolId);
    return this.prisma.school_schedules.deleteMany({
      where: { id: scheduleId, school_id: schoolId },
    });
  }

  async addContact(tenantId: string, schoolId: string, dto: CreateContactDto) {
    await this.findOne(tenantId, schoolId);
    return this.prisma.school_contacts.create({
      data: {
        school_id: schoolId,
        name: dto.name,
        role: dto.role,
        phone: dto.phone,
        email: dto.email,
      },
    });
  }

  async removeContact(tenantId: string, schoolId: string, contactId: string) {
    await this.findOne(tenantId, schoolId);
    return this.prisma.school_contacts.deleteMany({
      where: { id: contactId, school_id: schoolId },
    });
  }
}
