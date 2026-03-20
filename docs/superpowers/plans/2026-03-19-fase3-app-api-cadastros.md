# Fase 3 — app-api: Cadastros Base Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar os quatro módulos de cadastro base da app-api — Escolas, Alunos, Motoristas e Veículos — com todos os endpoints CRUD, exportação CSV, convites de motorista e validação de licença, com deploy em produção no Railway após cada sprint.

**Architecture:** Módulos NestJS por domínio (Module → Controller → Service → DTOs), todos protegidos por `JwtAuthGuard + TenantGuard`. Cada service recebe `tenantId` via `@TenantId()` e escopa todas as queries por `tenant_id`. Exportação CSV usa a biblioteca `csv-stringify`. Convites de motorista gravam em `app.invite_tokens` (mesma tabela dos convites de gestor da management-api). Validação de limite de licença faz cross-schema query em `management.licenses` via `$queryRaw`.

**Tech Stack:** NestJS 10, Prisma 5 (schema `app`), `class-validator`, `class-transformer`, `uuid`, `csv-stringify`, Jest.

**Pré-requisito:** Fase 1 concluída — `JwtAuthGuard`, `TenantGuard`, `@CurrentUser()`, `@TenantId()` disponíveis em `services/app-api/src/auth/`.

**Spec:** `docs/superpowers/specs/2026-03-19-backend-roadmap-design.md` § Fase 3
**Vault:** `RouttesApp_Core/CORE/Requisitos funcionais.md` § RF09, RF10, RF11, RF12, RF20.1
**Vault:** `RouttesApp_Core/CORE/Modelagem de dados.md` § Domínio de Operação Escolar, Frotas, Identidade

---

## Arquivos a criar / modificar

```
services/app-api/
├── src/
│   ├── operational/
│   │   ├── schools/
│   │   │   ├── schools.module.ts
│   │   │   ├── schools.controller.ts      ← CRUD + schedules + contacts
│   │   │   ├── schools.service.ts
│   │   │   └── dto/
│   │   │       ├── create-school.dto.ts
│   │   │       ├── update-school.dto.ts
│   │   │       ├── create-schedule.dto.ts
│   │   │       └── create-contact.dto.ts
│   │   │
│   │   ├── students/
│   │   │   ├── students.module.ts
│   │   │   ├── students.controller.ts     ← CRUD + CSV export
│   │   │   ├── students.service.ts
│   │   │   └── dto/
│   │   │       ├── create-student.dto.ts
│   │   │       ├── update-student.dto.ts
│   │   │       ├── create-guardian.dto.ts
│   │   │       └── create-address.dto.ts
│   │   │
│   │   ├── drivers/
│   │   │   ├── drivers.module.ts
│   │   │   ├── drivers.controller.ts      ← CRUD + invite + CSV export
│   │   │   ├── drivers.service.ts
│   │   │   └── dto/
│   │   │       ├── create-driver.dto.ts
│   │   │       ├── update-driver.dto.ts
│   │   │       └── create-invite.dto.ts
│   │   │
│   │   └── vehicles/
│   │       ├── vehicles.module.ts
│   │       ├── vehicles.controller.ts     ← CRUD + driver assignment
│   │       ├── vehicles.service.ts
│   │       └── dto/
│   │           ├── create-vehicle.dto.ts
│   │           ├── update-vehicle.dto.ts
│   │           └── assign-driver.dto.ts
│   │
│   └── app.module.ts                      ← Modify: importar todos os módulos
│
└── test/
    └── operational/
        ├── schools.service.spec.ts
        ├── students.service.spec.ts
        ├── drivers.service.spec.ts
        └── vehicles.service.spec.ts
```

---

## Task 0: Verificação de pré-requisitos (obrigatória antes de qualquer código)

- [ ] **0.1** Confirmar que `JwtAuthGuard` e `TenantGuard` existem na app-api:

```bash
ls services/app-api/src/auth/guards/
```

Expected: `jwt-auth.guard.ts` e `tenant.guard.ts`. Se não existirem, concluir Fase 1 primeiro.

- [ ] **0.2** Confirmar que o Prisma Client da app-api tem os models das entidades da Fase 3:

```bash
grep -n "model schools\|model students\|model vehicles\|model users\|model driver_profiles\|model invite_tokens" \
  services/app-api/src/prisma/schema.prisma
```

Expected: todos os models presentes. Se não, executar `prisma db pull` antes de continuar.

- [ ] **0.3** Confirmar que `management.licenses` está acessível via cross-schema query (necessário para validação de limite de veículos/motoristas):

```sql
-- Via Neon MCP no branch production:
SELECT tenant_id, max_vehicles, max_drivers, max_managers
FROM management.licenses
LIMIT 1;
```

Expected: sem erro de permissão. Se falhar, executar: `GRANT USAGE ON SCHEMA management TO <role>; GRANT SELECT ON management.licenses TO <role>;`

- [ ] **0.4** Instalar dependência de CSV:

```bash
cd services/app-api && pnpm add csv-stringify && pnpm add -D @types/csv-stringify
```

- [ ] **0.5** Verificar compilação atual (linha base):

```bash
cd services/app-api && pnpm exec tsc --noEmit
```

Expected: zero erros pré-existentes.

---

## Sprint 3.1 — Escolas (RF12)

**Definição de pronto:** endpoints de escolas, schedules e contacts funcionando em produção.

### Task 1: DTOs de Escola

**Files:**
- Create: `services/app-api/src/operational/schools/dto/create-school.dto.ts`
- Create: `services/app-api/src/operational/schools/dto/update-school.dto.ts`
- Create: `services/app-api/src/operational/schools/dto/create-schedule.dto.ts`
- Create: `services/app-api/src/operational/schools/dto/create-contact.dto.ts`

- [ ] **1.1** Criar `create-school.dto.ts`:

```typescript
import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional } from 'class-validator';

export enum SchoolType {
  SCHOOL = 'school',
  SERVICE_POINT = 'service_point',
}

export class CreateSchoolDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsEnum(SchoolType)
  type: SchoolType;
}
```

- [ ] **1.2** Criar `update-school.dto.ts`:

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateSchoolDto } from './create-school.dto';
import { IsEnum, IsOptional } from 'class-validator';

export enum SchoolStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class UpdateSchoolDto extends PartialType(CreateSchoolDto) {
  @IsEnum(SchoolStatus)
  @IsOptional()
  status?: SchoolStatus;
}
```

- [ ] **1.3** Criar `create-schedule.dto.ts`:

```typescript
import { IsEnum, IsString, Matches } from 'class-validator';

export enum Shift {
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  EVENING = 'evening',
}

export class CreateScheduleDto {
  @IsEnum(Shift)
  shift: Shift;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'entry_time must be HH:MM' })
  entry_time: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'exit_time must be HH:MM' })
  exit_time: string;
}
```

- [ ] **1.4** Criar `create-contact.dto.ts`:

```typescript
import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;
}
```

- [ ] **1.5** Commit:

```bash
git add services/app-api/src/operational/schools/dto/
git commit -m "feat(app-api): add schools DTOs"
```

---

### Task 2: SchoolsService com testes

**Files:**
- Create: `services/app-api/src/operational/schools/schools.service.ts`
- Create: `test/operational/schools.service.spec.ts`

- [ ] **2.1** Escrever `test/operational/schools.service.spec.ts` (failing first):

```typescript
import { Test } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { SchoolsService } from '../../src/operational/schools/schools.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { SchoolType } from '../../src/operational/schools/dto/create-school.dto';

describe('SchoolsService', () => {
  let service: SchoolsService;
  let prisma: {
    schools: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    school_schedules: { create: jest.Mock; deleteMany: jest.Mock };
    school_contacts: { create: jest.Mock; delete: jest.Mock };
  };

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
  };

  beforeEach(async () => {
    prisma = {
      schools: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      school_schedules: { create: jest.fn(), deleteMany: jest.fn() },
      school_contacts: { create: jest.fn(), delete: jest.fn() },
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
      expect.objectContaining({ data: expect.objectContaining({ tenant_id: tenantId }) }),
    );
  });

  it('should list schools filtered by tenant', async () => {
    prisma.schools.findMany.mockResolvedValue([mockSchool]);

    const result = await service.findAll(tenantId);

    expect(result).toHaveLength(1);
    expect(prisma.schools.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenant_id: tenantId }) }),
    );
  });

  it('should throw NotFoundException when school not found', async () => {
    prisma.schools.findFirst.mockResolvedValue(null);

    await expect(service.findOne(tenantId, 'nonexistent')).rejects.toThrow(NotFoundException);
  });

  it('should add a schedule to a school', async () => {
    prisma.schools.findFirst.mockResolvedValue(mockSchool);
    prisma.school_schedules.create.mockResolvedValue({ id: 'sched-1', school_id: 'school-uuid-1', shift: 'morning', entry_time: '07:00', exit_time: '12:00' });

    const result = await service.addSchedule(tenantId, 'school-uuid-1', {
      shift: 'morning' as any,
      entry_time: '07:00',
      exit_time: '12:00',
    });

    expect(result.shift).toBe('morning');
  });

  it('should add a contact to a school', async () => {
    prisma.schools.findFirst.mockResolvedValue(mockSchool);
    prisma.school_contacts.create.mockResolvedValue({ id: 'contact-1', name: 'Diretora Maria' });

    const result = await service.addContact(tenantId, 'school-uuid-1', {
      name: 'Diretora Maria',
    });

    expect(result.name).toBe('Diretora Maria');
  });
});
```

- [ ] **2.2** Rodar testes para confirmar que falham:

```bash
cd services/app-api && pnpm test -- --testPathPattern=schools.service
```

Expected: FAIL — "Cannot find module '../../src/operational/schools/schools.service'"

- [ ] **2.3** Criar `services/app-api/src/operational/schools/schools.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { CreateContactDto } from './dto/create-contact.dto';

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
        type: dto.type,
        status: 'active',
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.schools.findMany({
      where: { tenant_id: tenantId },
      include: {
        school_schedules: true,
        school_contacts: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const school = await this.prisma.schools.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        school_schedules: true,
        school_contacts: true,
      },
    });
    if (!school) throw new NotFoundException(`School ${id} not found`);
    return school;
  }

  async update(tenantId: string, id: string, dto: UpdateSchoolDto) {
    await this.findOne(tenantId, id);
    return this.prisma.schools.update({
      where: { id },
      data: dto,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.schools.update({
      where: { id },
      data: { status: 'inactive' },
    });
  }

  async addSchedule(tenantId: string, schoolId: string, dto: CreateScheduleDto) {
    await this.findOne(tenantId, schoolId);
    return this.prisma.school_schedules.create({
      data: {
        school_id: schoolId,
        shift: dto.shift,
        entry_time: dto.entry_time,
        exit_time: dto.exit_time,
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
    return this.prisma.school_contacts.delete({
      where: { id: contactId },
    });
  }
}
```

- [ ] **2.4** Rodar testes para confirmar que passam:

```bash
cd services/app-api && pnpm test -- --testPathPattern=schools.service
```

Expected: PASS — 5 tests passando.

- [ ] **2.5** Commit:

```bash
git add services/app-api/src/operational/schools/schools.service.ts test/operational/schools.service.spec.ts
git commit -m "feat(app-api): add SchoolsService with CRUD, schedules and contacts"
```

---

### Task 3: SchoolsController e SchoolsModule

**Files:**
- Create: `services/app-api/src/operational/schools/schools.controller.ts`
- Create: `services/app-api/src/operational/schools/schools.module.ts`
- Modify: `services/app-api/src/app.module.ts`

- [ ] **3.1** Criar `schools.controller.ts`:

```typescript
import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
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

  // Schedules
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

  // Contacts
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
```

- [ ] **3.2** Criar `schools.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { SchoolsController } from './schools.controller';
import { SchoolsService } from './schools.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SchoolsController],
  providers: [SchoolsService],
  exports: [SchoolsService],
})
export class SchoolsModule {}
```

- [ ] **3.3** Adicionar `SchoolsModule` no `app.module.ts`:

```typescript
import { SchoolsModule } from './operational/schools/schools.module';
// Adicionar no array imports:
SchoolsModule,
```

- [ ] **3.4** Verificar compilação:

```bash
cd services/app-api && pnpm exec tsc --noEmit
```

Expected: zero erros.

- [ ] **3.5** Rodar todos os testes:

```bash
cd services/app-api && pnpm test
```

Expected: todos passando.

- [ ] **3.6** Commit:

```bash
git add services/app-api/src/operational/schools/ services/app-api/src/app.module.ts
git commit -m "feat(app-api): wire SchoolsModule — RF12 complete"
```

---

### Task 4: PR + Deploy Sprint 3.1

**Skill:** Ler `RouttesApp_Core/SKILLS/use-github/SKILL.md` antes do PR. Invocar `railway:use-railway` para deploy.

- [ ] **4.1** Criar PR `feat/fase3-escolas` → `main`:
  - Título: `feat: Fase 3.1 — Escolas (RF12)`
  - Verificar que não há secrets em código

- [ ] **4.2** Merge + deploy via railway:use-railway.

- [ ] **4.3** Validar em produção (com JWT válido de gestor):

```bash
# Criar escola
curl -X POST https://<app-api-url>/schools \
  -H "Authorization: Bearer <jwt-manager>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Escola Teste","address":"Rua A, 1","lat":-23.5,"lng":-46.6,"type":"school"}'

# Listar escolas
curl https://<app-api-url>/schools \
  -H "Authorization: Bearer <jwt-manager>"
```

Expected: 201 na criação, 200 com array na listagem.

---

## Sprint 3.2 — Alunos (RF09)

**Definição de pronto:** CRUD de alunos com responsáveis, endereços e exportação CSV funcionando em produção.

### Task 5: DTOs de Aluno

**Files:**
- Create: `services/app-api/src/operational/students/dto/create-student.dto.ts`
- Create: `services/app-api/src/operational/students/dto/update-student.dto.ts`
- Create: `services/app-api/src/operational/students/dto/create-guardian.dto.ts`
- Create: `services/app-api/src/operational/students/dto/create-address.dto.ts`

- [ ] **5.1** Criar `create-student.dto.ts`:

```typescript
import {
  IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, IsDateString, IsBoolean,
} from 'class-validator';
import { Shift } from '../schools/dto/create-schedule.dto';

export class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  school_id: string;

  @IsEnum(Shift)
  shift: Shift;

  @IsString()
  @IsOptional()
  class_name?: string;

  @IsString()
  @IsOptional()
  special_needs?: string;

  @IsNumber()
  @IsOptional()
  monthly_value?: number;

  @IsDateString()
  @IsOptional()
  contract_start?: string;
}
```

> **Nota:** `Shift` enum está definido em `schools/dto/create-schedule.dto.ts` — importar de lá para evitar duplicação.

- [ ] **5.2** Criar `update-student.dto.ts`:

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateStudentDto } from './create-student.dto';
import { IsEnum, IsOptional } from 'class-validator';

export enum StudentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class UpdateStudentDto extends PartialType(CreateStudentDto) {
  @IsEnum(StudentStatus)
  @IsOptional()
  status?: StudentStatus;
}
```

- [ ] **5.3** Criar `create-guardian.dto.ts`:

```typescript
import { IsString, IsNotEmpty, IsEmail, IsOptional, IsBoolean } from 'class-validator';

export class CreateGuardianDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsBoolean()
  @IsOptional()
  is_primary?: boolean;
}
```

- [ ] **5.4** Criar `create-address.dto.ts`:

```typescript
import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @IsNotEmpty()
  address: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}
```

- [ ] **5.5** Commit:

```bash
git add services/app-api/src/operational/students/dto/
git commit -m "feat(app-api): add students DTOs"
```

---

### Task 6: StudentsService com testes

**Files:**
- Create: `services/app-api/src/operational/students/students.service.ts`
- Create: `test/operational/students.service.spec.ts`

- [ ] **6.1** Escrever `test/operational/students.service.spec.ts` (failing first):

```typescript
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { StudentsService } from '../../src/operational/students/students.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { Shift } from '../../src/operational/schools/dto/create-schedule.dto';

describe('StudentsService', () => {
  let service: StudentsService;
  let prisma: {
    students: { create: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
    student_guardians: { create: jest.Mock; findFirst: jest.Mock; delete: jest.Mock };
    student_addresses: { create: jest.Mock; delete: jest.Mock };
  };

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
  };

  beforeEach(async () => {
    prisma = {
      students: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      student_guardians: { create: jest.fn(), findFirst: jest.fn(), delete: jest.fn() },
      student_addresses: { create: jest.fn(), delete: jest.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [
        StudentsService,
        { provide: PrismaService, useValue: prisma },
      ],
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
      expect.objectContaining({ data: expect.objectContaining({ tenant_id: tenantId }) }),
    );
  });

  it('should list students filtered by tenant', async () => {
    prisma.students.findMany.mockResolvedValue([mockStudent]);

    const result = await service.findAll(tenantId);

    expect(result).toHaveLength(1);
    expect(prisma.students.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenant_id: tenantId }) }),
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
    // Must NOT use delete — preserves operational history
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
      { ...mockStudent, student_guardians: [{ name: 'Maria', phone: '11999', email: null, is_primary: true }] },
    ]);

    const csv = await service.exportCsv(tenantId);

    expect(typeof csv).toBe('string');
    expect(csv).toContain('João da Silva');
    expect(csv).toContain('Maria');
  });
});
```

- [ ] **6.2** Rodar testes para confirmar que falham:

```bash
cd services/app-api && pnpm test -- --testPathPattern=students.service
```

Expected: FAIL

- [ ] **6.3** Criar `services/app-api/src/operational/students/students.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { stringify } from 'csv-stringify/sync';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { CreateGuardianDto } from './dto/create-guardian.dto';
import { CreateAddressDto } from './dto/create-address.dto';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateStudentDto) {
    return this.prisma.students.create({
      data: {
        tenant_id: tenantId,
        name: dto.name,
        school_id: dto.school_id,
        shift: dto.shift,
        class_name: dto.class_name ?? null,
        special_needs: dto.special_needs ?? null,
        monthly_value: dto.monthly_value ?? null,
        contract_start: dto.contract_start ? new Date(dto.contract_start) : null,
        status: 'active',
      },
    });
  }

  async findAll(tenantId: string, schoolId?: string) {
    return this.prisma.students.findMany({
      where: {
        tenant_id: tenantId,
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
      where: { id, tenant_id: tenantId },
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
      where: { id },
      data: {
        ...dto,
        contract_start: dto.contract_start ? new Date(dto.contract_start) : undefined,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.students.update({
      where: { id },
      data: { status: 'inactive' },
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
    return this.prisma.student_guardians.delete({ where: { id: guardianId } });
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
    return this.prisma.student_addresses.delete({ where: { id: addressId } });
  }

  async exportCsv(tenantId: string): Promise<string> {
    const students = await this.findAll(tenantId);

    const rows = students.map((s) => ({
      id: s.id,
      name: s.name,
      school: (s as any).schools?.name ?? '',
      shift: s.shift,
      class_name: s.class_name ?? '',
      status: s.status,
      guardian_name: s.student_guardians.find((g: any) => g.is_primary)?.name ?? '',
      guardian_phone: s.student_guardians.find((g: any) => g.is_primary)?.phone ?? '',
      guardian_email: s.student_guardians.find((g: any) => g.is_primary)?.email ?? '',
    }));

    return stringify(rows, { header: true });
  }
}
```

- [ ] **6.4** Rodar testes para confirmar que passam:

```bash
cd services/app-api && pnpm test -- --testPathPattern=students.service
```

Expected: PASS — 6 tests passando.

- [ ] **6.5** Commit:

```bash
git add services/app-api/src/operational/students/students.service.ts test/operational/students.service.spec.ts
git commit -m "feat(app-api): add StudentsService with CRUD, guardians, addresses and CSV export"
```

---

### Task 7: StudentsController e StudentsModule

**Files:**
- Create: `services/app-api/src/operational/students/students.controller.ts`
- Create: `services/app-api/src/operational/students/students.module.ts`
- Modify: `services/app-api/src/app.module.ts`

- [ ] **7.1** Criar `students.controller.ts`:

```typescript
import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Res,
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
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateStudentDto) {
    return this.studentsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.studentsService.remove(tenantId, id);
  }

  // Guardians
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

  // Addresses
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
```

- [ ] **7.2** Criar `students.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
```

- [ ] **7.3** Adicionar `StudentsModule` no `app.module.ts`.

- [ ] **7.4** Verificar compilação + testes:

```bash
cd services/app-api && pnpm exec tsc --noEmit && pnpm test
```

Expected: zero erros, todos os testes passando.

- [ ] **7.5** Commit:

```bash
git add services/app-api/src/operational/students/ services/app-api/src/app.module.ts
git commit -m "feat(app-api): wire StudentsModule — RF09 complete"
```

---

### Task 8: PR + Deploy Sprint 3.2

- [ ] **8.1** Criar PR `feat/fase3-alunos` → `main`.
- [ ] **8.2** Merge + deploy via railway:use-railway.
- [ ] **8.3** Validar `GET /students/export/csv` retorna arquivo CSV com cabeçalho correto.

---

## Sprint 3.3 — Motoristas (RF10, RF20.1)

**Definição de pronto:** CRUD de motoristas com perfil CNH, convite por link, reenvio e exportação CSV funcionando em produção.

### Task 9: DTOs de Motorista

**Files:**
- Create: `services/app-api/src/operational/drivers/dto/create-driver.dto.ts`
- Create: `services/app-api/src/operational/drivers/dto/update-driver.dto.ts`
- Create: `services/app-api/src/operational/drivers/dto/create-invite.dto.ts`

- [ ] **9.1** Criar `create-driver.dto.ts`:

```typescript
import { IsString, IsNotEmpty, IsEmail, IsDateString, IsOptional } from 'class-validator';

export class CreateDriverDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  // CNH fields — required at invite acceptance, optional at initial creation
  @IsString()
  @IsOptional()
  cnh?: string;

  @IsDateString()
  @IsOptional()
  cnh_validity?: string;

  @IsString()
  @IsOptional()
  cnh_category?: string;
}
```

- [ ] **9.2** Criar `update-driver.dto.ts`:

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateDriverDto } from './create-driver.dto';
import { IsEnum, IsOptional } from 'class-validator';

export enum DriverStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class UpdateDriverDto extends PartialType(CreateDriverDto) {
  @IsEnum(DriverStatus)
  @IsOptional()
  status?: DriverStatus;
}
```

- [ ] **9.3** Criar `create-invite.dto.ts`:

```typescript
import { IsEmail, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class CreateDriverInviteDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  driver_user_id?: string; // se já existe um user pendente de convite
}
```

- [ ] **9.4** Commit:

```bash
git add services/app-api/src/operational/drivers/dto/
git commit -m "feat(app-api): add drivers DTOs"
```

---

### Task 10: DriversService com testes

**Files:**
- Create: `services/app-api/src/operational/drivers/drivers.service.ts`
- Create: `test/operational/drivers.service.spec.ts`

- [ ] **10.1** Escrever `test/operational/drivers.service.spec.ts` (failing first):

```typescript
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DriversService } from '../../src/operational/drivers/drivers.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('DriversService', () => {
  let service: DriversService;
  let prisma: {
    users: { create: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
    driver_profiles: { create: jest.Mock; update: jest.Mock; upsert: jest.Mock };
    invite_tokens: { create: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
  };

  const tenantId = 'tenant-uuid-1';
  const currentUserId = 'manager-uuid-1';

  const mockDriver = {
    id: 'driver-uuid-1',
    tenant_id: tenantId,
    role: 'driver',
    name: 'Carlos Motorista',
    email: 'carlos@empresa.com',
    status: 'active',
    created_at: new Date(),
    driver_profiles: {
      user_id: 'driver-uuid-1',
      cnh: '12345678900',
      cnh_validity: new Date('2026-12-31'),
      cnh_category: 'D',
    },
  };

  beforeEach(async () => {
    prisma = {
      users: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      driver_profiles: { create: jest.fn(), update: jest.fn(), upsert: jest.fn() },
      invite_tokens: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [
        DriversService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(DriversService);
  });

  it('should list drivers filtered by tenant', async () => {
    prisma.users.findMany.mockResolvedValue([mockDriver]);

    const result = await service.findAll(tenantId);

    expect(result).toHaveLength(1);
    expect(prisma.users.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenant_id: tenantId, role: 'driver' }),
      }),
    );
  });

  it('should throw NotFoundException when driver not found', async () => {
    prisma.users.findFirst.mockResolvedValue(null);

    await expect(service.findOne(tenantId, 'nonexistent')).rejects.toThrow(NotFoundException);
  });

  it('should inactivate driver without deleting (RF10.6)', async () => {
    prisma.users.findFirst.mockResolvedValue(mockDriver);
    prisma.users.update.mockResolvedValue({ ...mockDriver, status: 'inactive' });

    const result = await service.remove(tenantId, 'driver-uuid-1');

    expect(result.status).toBe('inactive');
    expect(prisma.users.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'inactive' } }),
    );
  });

  it('should generate an invite token for a driver (RF20.1)', async () => {
    prisma.users.findFirst.mockResolvedValue(mockDriver);
    prisma.invite_tokens.create.mockResolvedValue({
      id: 'invite-uuid-1',
      token: 'abc123tok',
      role: 'driver',
      expires_at: new Date(),
    });

    const result = await service.generateInvite(tenantId, currentUserId, 'driver-uuid-1');

    expect(result.token).toBe('abc123tok');
    expect(prisma.invite_tokens.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: 'driver', tenant_id: tenantId }),
      }),
    );
  });

  it('should resend invite by invalidating old and creating new (RF10.3)', async () => {
    prisma.users.findFirst.mockResolvedValue(mockDriver);
    prisma.invite_tokens.findFirst.mockResolvedValue({
      id: 'old-invite',
      token: 'oldtok',
      role: 'driver',
      used_at: null,
    });
    prisma.invite_tokens.update.mockResolvedValue({});
    prisma.invite_tokens.create.mockResolvedValue({ id: 'new-invite', token: 'newtok' });

    const result = await service.resendInvite(tenantId, currentUserId, 'driver-uuid-1');

    expect(prisma.invite_tokens.update).toHaveBeenCalled(); // old invite invalidated
    expect(result.token).toBe('newtok');
  });

  it('should export drivers as CSV', async () => {
    prisma.users.findMany.mockResolvedValue([mockDriver]);

    const csv = await service.exportCsv(tenantId);

    expect(typeof csv).toBe('string');
    expect(csv).toContain('Carlos Motorista');
  });
});
```

- [ ] **10.2** Rodar testes para confirmar que falham:

```bash
cd services/app-api && pnpm test -- --testPathPattern=drivers.service
```

Expected: FAIL

- [ ] **10.3** Criar `services/app-api/src/operational/drivers/drivers.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { stringify } from 'csv-stringify/sync';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateDriverDto) {
    const user = await this.prisma.users.create({
      data: {
        tenant_id: tenantId,
        role: 'driver',
        name: dto.name,
        email: dto.email,
        status: 'active',
        // firebase_uid será preenchido quando o motorista aceitar o convite
        firebase_uid: `pending_${randomBytes(8).toString('hex')}`,
      },
    });

    if (dto.cnh) {
      await this.prisma.driver_profiles.create({
        data: {
          user_id: user.id,
          cnh: dto.cnh,
          cnh_validity: dto.cnh_validity ? new Date(dto.cnh_validity) : null,
          cnh_category: dto.cnh_category ?? null,
        },
      });
    }

    return user;
  }

  async findAll(tenantId: string) {
    return this.prisma.users.findMany({
      where: { tenant_id: tenantId, role: 'driver' },
      include: { driver_profiles: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const driver = await this.prisma.users.findFirst({
      where: { id, tenant_id: tenantId, role: 'driver' },
      include: { driver_profiles: true },
    });
    if (!driver) throw new NotFoundException(`Driver ${id} not found`);
    return driver;
  }

  async update(tenantId: string, id: string, dto: UpdateDriverDto) {
    await this.findOne(tenantId, id);

    const { cnh, cnh_validity, cnh_category, ...userFields } = dto;

    const user = await this.prisma.users.update({
      where: { id },
      data: userFields,
    });

    if (cnh) {
      await this.prisma.driver_profiles.upsert({
        where: { user_id: id },
        create: {
          user_id: id,
          cnh,
          cnh_validity: cnh_validity ? new Date(cnh_validity) : null,
          cnh_category: cnh_category ?? null,
        },
        update: {
          cnh,
          cnh_validity: cnh_validity ? new Date(cnh_validity) : null,
          cnh_category: cnh_category ?? null,
        },
      });
    }

    return user;
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.users.update({
      where: { id },
      data: { status: 'inactive' },
    });
  }

  async generateInvite(tenantId: string, createdBy: string, driverUserId: string) {
    await this.findOne(tenantId, driverUserId);

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    return this.prisma.invite_tokens.create({
      data: {
        tenant_id: tenantId,
        token,
        role: 'driver',
        expires_at: expiresAt,
        created_by: createdBy,
      },
    });
  }

  async resendInvite(tenantId: string, createdBy: string, driverUserId: string) {
    await this.findOne(tenantId, driverUserId);

    // Invalidate existing unused invite
    const existing = await this.prisma.invite_tokens.findFirst({
      where: { tenant_id: tenantId, created_by: createdBy, role: 'driver', used_at: null },
      orderBy: { expires_at: 'desc' },
    });

    if (existing) {
      await this.prisma.invite_tokens.update({
        where: { id: existing.id },
        data: { expires_at: new Date() }, // expire immediately
      });
    }

    return this.generateInvite(tenantId, createdBy, driverUserId);
  }

  async exportCsv(tenantId: string): Promise<string> {
    const drivers = await this.findAll(tenantId);

    const rows = drivers.map((d) => ({
      id: d.id,
      name: d.name,
      email: d.email,
      status: d.status,
      cnh: (d as any).driver_profiles?.cnh ?? '',
      cnh_category: (d as any).driver_profiles?.cnh_category ?? '',
      cnh_validity: (d as any).driver_profiles?.cnh_validity
        ? new Date((d as any).driver_profiles.cnh_validity).toISOString().split('T')[0]
        : '',
    }));

    return stringify(rows, { header: true });
  }
}
```

- [ ] **10.4** Rodar testes para confirmar que passam:

```bash
cd services/app-api && pnpm test -- --testPathPattern=drivers.service
```

Expected: PASS — 6 tests passando.

- [ ] **10.5** Commit:

```bash
git add services/app-api/src/operational/drivers/drivers.service.ts test/operational/drivers.service.spec.ts
git commit -m "feat(app-api): add DriversService with CRUD, invite, resend invite and CSV export"
```

---

### Task 11: DriversController e DriversModule

**Files:**
- Create: `services/app-api/src/operational/drivers/drivers.controller.ts`
- Create: `services/app-api/src/operational/drivers/drivers.module.ts`
- Modify: `services/app-api/src/app.module.ts`

- [ ] **11.1** Criar `drivers.controller.ts`:

```typescript
import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Res,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { TenantId } from '../../auth/decorators/tenant-id.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtPayload } from '@routtes/shared';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

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

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.driversService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDriverDto,
  ) {
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
```

- [ ] **11.2** Criar `drivers.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DriversController],
  providers: [DriversService],
  exports: [DriversService],
})
export class DriversModule {}
```

- [ ] **11.3** Adicionar `DriversModule` no `app.module.ts`.

- [ ] **11.4** Verificar compilação + testes:

```bash
cd services/app-api && pnpm exec tsc --noEmit && pnpm test
```

Expected: zero erros, todos os testes passando.

- [ ] **11.5** Commit:

```bash
git add services/app-api/src/operational/drivers/ services/app-api/src/app.module.ts
git commit -m "feat(app-api): wire DriversModule — RF10 + RF20.1 complete"
```

---

### Task 12: PR + Deploy Sprint 3.3

- [ ] **12.1** Criar PR `feat/fase3-motoristas` → `main`.
- [ ] **12.2** Merge + deploy via railway:use-railway.
- [ ] **12.3** Validar `POST /drivers/:id/invite` retorna `{ token, expires_at }`.

---

## Sprint 3.4 — Veículos (RF11)

**Definição de pronto:** CRUD de veículos com vínculo M:N de motoristas e validação de limite de licença funcionando em produção.

### Task 13: DTOs de Veículo

**Files:**
- Create: `services/app-api/src/operational/vehicles/dto/create-vehicle.dto.ts`
- Create: `services/app-api/src/operational/vehicles/dto/update-vehicle.dto.ts`
- Create: `services/app-api/src/operational/vehicles/dto/assign-driver.dto.ts`

- [ ] **13.1** Criar `create-vehicle.dto.ts`:

```typescript
import { IsString, IsNotEmpty, IsInt, IsOptional, Min } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty()
  plate: string;

  @IsInt()
  @Min(1)
  capacity: number;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  totem_id?: string;
}
```

- [ ] **13.2** Criar `update-vehicle.dto.ts`:

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateVehicleDto } from './create-vehicle.dto';
import { IsEnum, IsOptional } from 'class-validator';

export enum VehicleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {
  @IsEnum(VehicleStatus)
  @IsOptional()
  status?: VehicleStatus;
}
```

- [ ] **13.3** Criar `assign-driver.dto.ts`:

```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class AssignDriverDto {
  @IsString()
  @IsNotEmpty()
  driver_user_id: string;
}
```

- [ ] **13.4** Commit:

```bash
git add services/app-api/src/operational/vehicles/dto/
git commit -m "feat(app-api): add vehicles DTOs"
```

---

### Task 14: VehiclesService com testes (inclui validação de licença)

**Files:**
- Create: `services/app-api/src/operational/vehicles/vehicles.service.ts`
- Create: `test/operational/vehicles.service.spec.ts`

- [ ] **14.1** Escrever `test/operational/vehicles.service.spec.ts` (failing first):

```typescript
import { Test } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { VehiclesService } from '../../src/operational/vehicles/vehicles.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('VehiclesService', () => {
  let service: VehiclesService;
  let prisma: {
    vehicles: { create: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock; update: jest.Mock; count: jest.Mock };
    vehicle_drivers: { create: jest.Mock; delete: jest.Mock; findMany: jest.Mock };
    $queryRaw: jest.Mock;
  };

  const tenantId = 'tenant-uuid-1';

  const mockVehicle = {
    id: 'vehicle-uuid-1',
    tenant_id: tenantId,
    plate: 'ABC1D23',
    capacity: 15,
    model: 'Sprinter',
    status: 'active',
    created_at: new Date(),
  };

  const mockLicense = [{ max_vehicles: 5 }];

  beforeEach(async () => {
    prisma = {
      vehicles: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      vehicle_drivers: { create: jest.fn(), delete: jest.fn(), findMany: jest.fn() },
      $queryRaw: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        VehiclesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(VehiclesService);
  });

  it('should create a vehicle when under license limit', async () => {
    prisma.$queryRaw.mockResolvedValue(mockLicense);   // license: max 5
    prisma.vehicles.count.mockResolvedValue(3);         // current: 3
    prisma.vehicles.create.mockResolvedValue(mockVehicle);

    const result = await service.create(tenantId, {
      plate: 'ABC1D23',
      capacity: 15,
    });

    expect(result.id).toBe('vehicle-uuid-1');
  });

  it('should throw BadRequestException when license limit is reached (RF11.3)', async () => {
    prisma.$queryRaw.mockResolvedValue([{ max_vehicles: 3 }]);
    prisma.vehicles.count.mockResolvedValue(3); // at limit

    await expect(
      service.create(tenantId, { plate: 'XYZ9999', capacity: 10 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should list vehicles filtered by tenant', async () => {
    prisma.vehicles.findMany.mockResolvedValue([mockVehicle]);

    const result = await service.findAll(tenantId);

    expect(result).toHaveLength(1);
    expect(prisma.vehicles.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenant_id: tenantId }) }),
    );
  });

  it('should throw NotFoundException when vehicle not found', async () => {
    prisma.vehicles.findFirst.mockResolvedValue(null);

    await expect(service.findOne(tenantId, 'nonexistent')).rejects.toThrow(NotFoundException);
  });

  it('should assign a driver to a vehicle (M:N)', async () => {
    prisma.vehicles.findFirst.mockResolvedValue(mockVehicle);
    prisma.vehicle_drivers.create.mockResolvedValue({
      vehicle_id: 'vehicle-uuid-1',
      driver_user_id: 'driver-uuid-1',
      assigned_at: new Date(),
    });

    const result = await service.assignDriver(tenantId, 'vehicle-uuid-1', 'driver-uuid-1');

    expect(result.driver_user_id).toBe('driver-uuid-1');
  });

  it('should inactivate vehicle without deleting (RF11.5)', async () => {
    prisma.vehicles.findFirst.mockResolvedValue(mockVehicle);
    prisma.vehicles.update.mockResolvedValue({ ...mockVehicle, status: 'inactive' });

    const result = await service.remove(tenantId, 'vehicle-uuid-1');

    expect(result.status).toBe('inactive');
    expect(prisma.vehicles.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'inactive' } }),
    );
  });
});
```

- [ ] **14.2** Rodar testes para confirmar que falham:

```bash
cd services/app-api && pnpm test -- --testPathPattern=vehicles.service
```

Expected: FAIL

- [ ] **14.3** Criar `services/app-api/src/operational/vehicles/vehicles.service.ts`:

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  private async checkVehicleLimit(tenantId: string): Promise<void> {
    const licenseRows = await this.prisma.$queryRaw<{ max_vehicles: number }[]>`
      SELECT max_vehicles
      FROM management.licenses
      WHERE tenant_id = ${tenantId}::uuid
      LIMIT 1
    `;

    if (!licenseRows.length) return; // no license configured — allow (superadmin scenario)

    const limit = licenseRows[0].max_vehicles;
    const current = await this.prisma.vehicles.count({
      where: { tenant_id: tenantId, status: 'active' },
    });

    if (current >= limit) {
      throw new BadRequestException(
        `Vehicle limit reached (${current}/${limit}). Upgrade your license to add more vehicles.`,
      );
    }
  }

  async create(tenantId: string, dto: CreateVehicleDto) {
    await this.checkVehicleLimit(tenantId);

    return this.prisma.vehicles.create({
      data: {
        tenant_id: tenantId,
        plate: dto.plate,
        capacity: dto.capacity,
        model: dto.model ?? null,
        totem_id: dto.totem_id ?? null,
        status: 'active',
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.vehicles.findMany({
      where: { tenant_id: tenantId },
      include: {
        vehicle_drivers: {
          include: {
            users: { select: { id: true, name: true, status: true } },
          },
        },
      },
      orderBy: { plate: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const vehicle = await this.prisma.vehicles.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        vehicle_drivers: {
          include: {
            users: { select: { id: true, name: true, status: true } },
          },
        },
      },
    });
    if (!vehicle) throw new NotFoundException(`Vehicle ${id} not found`);
    return vehicle;
  }

  async update(tenantId: string, id: string, dto: UpdateVehicleDto) {
    await this.findOne(tenantId, id);
    return this.prisma.vehicles.update({
      where: { id },
      data: dto,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.vehicles.update({
      where: { id },
      data: { status: 'inactive' },
    });
  }

  async assignDriver(tenantId: string, vehicleId: string, driverUserId: string) {
    await this.findOne(tenantId, vehicleId);
    return this.prisma.vehicle_drivers.create({
      data: {
        vehicle_id: vehicleId,
        driver_user_id: driverUserId,
        assigned_at: new Date(),
      },
    });
  }

  async removeDriver(tenantId: string, vehicleId: string, driverUserId: string) {
    await this.findOne(tenantId, vehicleId);
    return this.prisma.vehicle_drivers.delete({
      where: {
        vehicle_id_driver_user_id: {
          vehicle_id: vehicleId,
          driver_user_id: driverUserId,
        },
      },
    });
  }
}
```

- [ ] **14.4** Rodar testes para confirmar que passam:

```bash
cd services/app-api && pnpm test -- --testPathPattern=vehicles.service
```

Expected: PASS — 6 tests passando.

- [ ] **14.5** Commit:

```bash
git add services/app-api/src/operational/vehicles/vehicles.service.ts test/operational/vehicles.service.spec.ts
git commit -m "feat(app-api): add VehiclesService with CRUD, driver assignment and license limit validation"
```

---

### Task 15: VehiclesController e VehiclesModule

**Files:**
- Create: `services/app-api/src/operational/vehicles/vehicles.controller.ts`
- Create: `services/app-api/src/operational/vehicles/vehicles.module.ts`
- Modify: `services/app-api/src/app.module.ts`

- [ ] **15.1** Criar `vehicles.controller.ts`:

```typescript
import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { TenantId } from '../../auth/decorators/tenant-id.decorator';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { AssignDriverDto } from './dto/assign-driver.dto';

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
```

- [ ] **15.2** Criar `vehicles.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [VehiclesService],
})
export class VehiclesModule {}
```

- [ ] **15.3** Adicionar `VehiclesModule` no `app.module.ts`.

- [ ] **15.4** Verificar compilação + todos os testes:

```bash
cd services/app-api && pnpm exec tsc --noEmit && pnpm test
```

Expected: zero erros, todos os testes passando.

- [ ] **15.5** Commit:

```bash
git add services/app-api/src/operational/vehicles/ services/app-api/src/app.module.ts
git commit -m "feat(app-api): wire VehiclesModule — RF11 complete"
```

---

### Task 16: PR + Deploy Sprint 3.4

- [ ] **16.1** Criar PR `feat/fase3-veiculos` → `main`.
- [ ] **16.2** Merge + deploy via railway:use-railway.
- [ ] **16.3** Validar em produção:

```bash
# Tentar criar veículo acima do limite da licença
# Expected: 400 Bad Request com mensagem de limite
curl -X POST https://<app-api-url>/vehicles \
  -H "Authorization: Bearer <jwt-manager>" \
  -H "Content-Type: application/json" \
  -d '{"plate":"TST9999","capacity":10}'

# Vincular motorista ao veículo
curl -X POST https://<app-api-url>/vehicles/<vehicle-id>/drivers \
  -H "Authorization: Bearer <jwt-manager>" \
  -H "Content-Type: application/json" \
  -d '{"driver_user_id":"<driver-id>"}'
```

---

## Definição de Pronto da Fase 3

- [ ] **RF12:** `POST/GET/PATCH/DELETE /schools` com schedules e contacts funcionando em produção
- [ ] **RF09:** `POST/GET/PATCH/DELETE /students` com guardians, addresses e `GET /students/export/csv` funcionando em produção
- [ ] **RF10 + RF20.1:** `POST/GET/PATCH/DELETE /drivers` com `POST /drivers/:id/invite`, `POST /drivers/:id/invite/resend` e `GET /drivers/export/csv` funcionando em produção
- [ ] **RF11:** `POST/GET/PATCH/DELETE /vehicles` com `POST/DELETE /vehicles/:id/drivers` e validação de limite de licença via cross-schema query funcionando em produção
- [ ] Todas as rotas protegidas por `JwtAuthGuard + TenantGuard` — requisição sem token retorna 401
- [ ] Todas as queries escopadas por `tenant_id` — dados de outros tenants jamais retornados
- [ ] `GET /health` continua 200 em produção após todos os deploys
- [ ] Todos os testes unitários passam (`pnpm test` em `services/app-api`)

---

## Notas de design

**Validação de limite de licença via cross-schema:** `VehiclesService.checkVehicleLimit()` usa `$queryRaw` para consultar `management.licenses` pois o Prisma da app-api só tem acesso ao schema `app`. O role Neon precisa ter `USAGE` no schema `management` e `SELECT` em `management.licenses` — verificado na Task 0.3. O mesmo padrão será reutilizado em `DriversService` quando o RF10 exigir validação de limite de motoristas.

**`firebase_uid` de motoristas pendentes:** Ao criar um motorista sem Firebase account, o service gera um `firebase_uid` sintético com prefixo `pending_`. Este valor é sobrescrito pelo `firebase_uid` real quando o motorista aceita o convite e completa o cadastro no app. Essa flag é interna e não exposta na API.

**Exportação CSV:** Usa `csv-stringify/sync` para geração em memória. Para volumes maiores que ~10.000 registros (pós-MVP), considerar streaming via `csv-stringify` assíncrono com `PassThrough` stream.

**Rota `GET /students/export/csv`:** Posicionada antes de `GET /students/:id` no controller para evitar que o NestJS interprete `"export"` como um UUID. A ordem de declaração dos decorators/rotas em NestJS é processada em sequência — prefixos literais devem vir antes de parâmetros dinâmicos.

**Cross-schema no manage de licença:** `$queryRaw` com `::uuid` cast é necessário pois o Prisma passa strings como text por default no PostgreSQL; o cast explícito garante uso do índice `tenant_id` da tabela `management.licenses`.
