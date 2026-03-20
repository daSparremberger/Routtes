import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { StudentsService } from './students.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Shift } from '../schools/dto/create-schedule.dto';

describe('StudentsService', () => {
  let service: StudentsService;
  let prisma: any;

  const tenantId = 'tenant-uuid-1';
  const mockStudent = {
    id: 'student-uuid-1',
    tenant_id: tenantId,
    name: 'João da Silva',
    school_id: 'school-uuid-1',
    shift: 'morning',
    class_name: '5A',
    status: 'active',
    created_at: new Date(),
    student_guardians: [],
    student_addresses: [],
    schools: { name: 'Escola A' },
  };

  beforeEach(async () => {
    prisma = {
      students: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      student_guardians: {
        create: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
      student_addresses: {
        create: jest.fn(),
        delete: jest.fn(),
      },
    };
    const module = await Test.createTestingModule({
      providers: [StudentsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(StudentsService);
  });

  it('should create a student scoped to tenant', async () => {
    prisma.students.create.mockResolvedValue(mockStudent);
    const result = await service.create(tenantId, {
      name: 'João da Silva',
      school_id: 'school-uuid-1',
      shift: Shift.MORNING,
    });
    expect(result.id).toBe('student-uuid-1');
    expect(prisma.students.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenant_id: tenantId }),
      }),
    );
  });

  it('should list students filtered by tenant', async () => {
    prisma.students.findMany.mockResolvedValue([mockStudent]);
    const result = await service.findAll(tenantId);
    expect(result).toHaveLength(1);
    expect(prisma.students.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenant_id: tenantId }),
      }),
    );
  });

  it('should throw NotFoundException when student not found', async () => {
    prisma.students.findFirst.mockResolvedValue(null);
    await expect(service.findOne(tenantId, 'nonexistent')).rejects.toThrow(NotFoundException);
  });

  it('should inactivate student without deleting (RF09.6)', async () => {
    prisma.students.findFirst.mockResolvedValue(mockStudent);
    prisma.students.update.mockResolvedValue({ ...mockStudent, status: 'inactive' });
    const result = await service.remove(tenantId, 'student-uuid-1');
    expect(result.status).toBe('inactive');
    expect(prisma.students.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'inactive' } }),
    );
  });

  it('should add a guardian to a student', async () => {
    prisma.students.findFirst.mockResolvedValue(mockStudent);
    prisma.student_guardians.create.mockResolvedValue({
      id: 'guard-1',
      student_id: 'student-uuid-1',
      name: 'Maria Silva',
      phone: '11999999999',
      is_primary: true,
    });
    const result = await service.addGuardian(tenantId, 'student-uuid-1', {
      name: 'Maria Silva',
      phone: '11999999999',
      is_primary: true,
    });
    expect(result.name).toBe('Maria Silva');
  });

  it('should export students as CSV', async () => {
    prisma.students.findMany.mockResolvedValue([
      {
        ...mockStudent,
        student_guardians: [{ name: 'Maria', phone: '11999', email: null, is_primary: true }],
      },
    ]);
    const csv = await service.exportCsv(tenantId);
    expect(typeof csv).toBe('string');
    expect(csv).toContain('João da Silva');
    expect(csv).toContain('Maria');
  });
});
