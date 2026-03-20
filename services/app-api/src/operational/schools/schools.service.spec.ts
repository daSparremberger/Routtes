import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SchoolType } from './dto/create-school.dto';
import { Shift } from './dto/create-schedule.dto';

describe('SchoolsService', () => {
  let service: SchoolsService;
  let prisma: any;

  const tenantId = 'tenant-uuid-1';
  const mockSchool = {
    id: 'school-uuid-1',
    tenant_id: tenantId,
    name: 'Escola Municipal A',
    address: 'Rua X, 100',
    lat: -23.5,
    lng: -46.6,
    type: 'school',
    status: 'active',
    created_at: new Date(),
    school_schedules: [],
    school_contacts: [],
  };

  beforeEach(async () => {
    prisma = {
      schools: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      school_schedules: {
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      school_contacts: {
        create: jest.fn(),
        delete: jest.fn(),
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        SchoolsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(SchoolsService);
  });

  it('should create a school', async () => {
    prisma.schools.create.mockResolvedValue(mockSchool);
    const result = await service.create(tenantId, {
      name: 'Escola Municipal A',
      address: 'Rua X, 100',
      lat: -23.5,
      lng: -46.6,
      type: SchoolType.SCHOOL,
    });
    expect(result.id).toBe('school-uuid-1');
    expect(prisma.schools.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenant_id: tenantId }),
      }),
    );
  });

  it('should list schools filtered by tenant', async () => {
    prisma.schools.findMany.mockResolvedValue([mockSchool]);
    const result = await service.findAll(tenantId);
    expect(result).toHaveLength(1);
    expect(prisma.schools.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenant_id: tenantId }),
      }),
    );
  });

  it('should throw NotFoundException when school not found', async () => {
    prisma.schools.findFirst.mockResolvedValue(null);
    await expect(service.findOne(tenantId, 'nonexistent')).rejects.toThrow(NotFoundException);
  });

  it('should add a schedule to a school', async () => {
    prisma.schools.findFirst.mockResolvedValue(mockSchool);
    prisma.school_schedules.create.mockResolvedValue({
      id: 'sched-1',
      school_id: 'school-uuid-1',
      shift: 'morning',
      entry_time: new Date('1970-01-01T07:00:00Z'),
      exit_time: new Date('1970-01-01T12:00:00Z'),
    });
    const result = await service.addSchedule(tenantId, 'school-uuid-1', {
      shift: Shift.MORNING,
      entry_time: '07:00',
      exit_time: '12:00',
    });
    expect(result.shift).toBe('morning');
  });

  it('should add a contact to a school', async () => {
    prisma.schools.findFirst.mockResolvedValue(mockSchool);
    prisma.school_contacts.create.mockResolvedValue({
      id: 'contact-1',
      name: 'Diretora Maria',
    });
    const result = await service.addContact(tenantId, 'school-uuid-1', {
      name: 'Diretora Maria',
    });
    expect(result.name).toBe('Diretora Maria');
  });
});
