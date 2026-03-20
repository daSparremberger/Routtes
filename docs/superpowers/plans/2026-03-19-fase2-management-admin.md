# Fase 2 — management-api: Domínios Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar todos os domínios administrativos da management-api — Tenants, Licenças, Módulos, Organizações, Contratos, Faturas, Dashboard Admin e Convites de Gestor — com deploy em produção no Railway após cada sprint.

**Architecture:** Módulos NestJS por domínio (Module → Controller → Service → DTOs), todos protegidos por `JwtAuthGuard + RolesGuard('superadmin')`. `AuditService` compartilhado grava em `management.audit_logs`. Efeitos colaterais de contratos (suspender tenant, gerar fatura, sincronizar licença) executados via `prisma.$transaction`. Convites de gestor escritos em `app.invite_tokens` via `prisma.$queryRaw` (cross-schema sem FK — padrão já estabelecido na Fase 1).

**Tech Stack:** NestJS 10, Prisma 5 (schema `management`), `class-validator`, `class-transformer`, `uuid`, Jest.

**Pré-requisito:** Fase 1 concluída — `JwtAuthGuard`, `RolesGuard`, `@CurrentUser()`, `@Roles()` disponíveis em `services/management-api/src/auth/`.

**Spec:** `docs/superpowers/specs/2026-03-19-backend-roadmap-design.md` § Fase 2
**Vault:** `RouttesApp_Core/CORE/Requisitos funcionais.md` § RF01–RF07, RF20.2
**Vault:** `RouttesApp_Core/CORE/Modelagem de dados.md`

---

## Arquivos a criar / modificar

```
services/management-api/
├── src/
│   ├── shared/
│   │   └── audit/
│   │       ├── audit.module.ts           ← exporta AuditService
│   │       ├── audit.service.ts          ← log(dto): Promise<void>
│   │       └── dto/
│   │           └── create-audit-log.dto.ts
│   │
│   ├── admin/
│   │   ├── tenants/
│   │   │   ├── tenants.module.ts
│   │   │   ├── tenants.controller.ts     ← CRUD + métricas + logs de auditoria
│   │   │   ├── tenants.service.ts
│   │   │   └── dto/
│   │   │       ├── create-tenant.dto.ts
│   │   │       └── update-tenant.dto.ts
│   │   │
│   │   ├── licenses/
│   │   │   ├── licenses.module.ts
│   │   │   ├── licenses.controller.ts    ← GET por tenant + uso + update manual
│   │   │   ├── licenses.service.ts
│   │   │   └── dto/
│   │   │       └── update-license.dto.ts
│   │   │
│   │   ├── modules/
│   │   │   ├── modules.module.ts
│   │   │   ├── modules.controller.ts     ← list + upsert + set tenant modules
│   │   │   ├── modules.service.ts
│   │   │   └── dto/
│   │   │       ├── upsert-module.dto.ts
│   │   │       └── set-tenant-modules.dto.ts
│   │   │
│   │   ├── organizations/
│   │   │   ├── organizations.module.ts
│   │   │   ├── organizations.controller.ts
│   │   │   ├── organizations.service.ts
│   │   │   └── dto/
│   │   │       ├── create-organization.dto.ts
│   │   │       └── update-organization.dto.ts
│   │   │
│   │   ├── contracts/
│   │   │   ├── contracts.module.ts
│   │   │   ├── contracts.controller.ts
│   │   │   ├── contracts.service.ts      ← create + updateStatus (side-effects em $transaction)
│   │   │   └── dto/
│   │   │       ├── create-contract.dto.ts
│   │   │       └── update-contract-status.dto.ts
│   │   │
│   │   ├── invoices/
│   │   │   ├── invoices.module.ts
│   │   │   ├── invoices.controller.ts
│   │   │   ├── invoices.service.ts       ← create, bulkGenerate, markPaid, cancel
│   │   │   └── dto/
│   │   │       ├── create-invoice.dto.ts
│   │   │       ├── mark-paid.dto.ts
│   │   │       └── bulk-generate.dto.ts
│   │   │
│   │   ├── dashboard/
│   │   │   ├── dashboard.module.ts
│   │   │   ├── dashboard.controller.ts   ← GET /admin/dashboard
│   │   │   └── dashboard.service.ts      ← getKpis, getCommercialKpis, getTenantUsage
│   │   │
│   │   └── invites/
│   │       ├── invites.module.ts
│   │       ├── invites.controller.ts     ← POST /admin/invites + resend
│   │       ├── invites.service.ts        ← generateManagerInvite, resendInvite
│   │       └── dto/
│   │           └── create-invite.dto.ts
│   │
│   └── app.module.ts                     ← Modify: importar todos os módulos admin
│
└── test/
    └── admin/
        ├── tenants.service.spec.ts
        ├── licenses.service.spec.ts
        ├── modules.service.spec.ts
        ├── organizations.service.spec.ts
        ├── contracts.service.spec.ts
        ├── invoices.service.spec.ts
        ├── dashboard.service.spec.ts
        └── invites.service.spec.ts
```

---

## Task 0: Verificação de pré-requisitos

**Files:** nenhum criado

- [ ] **0.1** Confirmar que Fase 1 está concluída:

```bash
ls services/management-api/src/auth/
# Deve conter: jwt.strategy.ts, jwt-auth.guard.ts, roles.guard.ts, roles.decorator.ts, current-user.decorator.ts
```

- [ ] **0.2** Confirmar que Prisma Client foi gerado com os modelos do schema `management`:

```bash
ls services/management-api/src/prisma/
# Deve conter: prisma.service.ts, schema.prisma
grep -i "model Tenant" services/management-api/src/prisma/schema.prisma
```

- [ ] **0.3** Confirmar tabelas existem no banco:

```bash
cd services/management-api && npx prisma db pull --print 2>&1 | grep "model " | head -20
```

Esperado: modelos `Tenant`, `Organization`, `Contract`, `Invoice`, `License`, `Module`, `TenantModule`, `AuditLog` listados.

- [ ] **0.4** Commit se não houver nada pendente da Fase 1:

```bash
git status
```

---

## Task 2.1: AuditService compartilhado + módulo Tenants (RF01)

**Files:**
- Create: `services/management-api/src/shared/audit/dto/create-audit-log.dto.ts`
- Create: `services/management-api/src/shared/audit/audit.service.ts`
- Create: `services/management-api/src/shared/audit/audit.module.ts`
- Create: `services/management-api/src/admin/tenants/dto/create-tenant.dto.ts`
- Create: `services/management-api/src/admin/tenants/dto/update-tenant.dto.ts`
- Create: `services/management-api/src/admin/tenants/tenants.service.ts`
- Create: `services/management-api/src/admin/tenants/tenants.controller.ts`
- Create: `services/management-api/src/admin/tenants/tenants.module.ts`
- Create: `services/management-api/test/admin/tenants.service.spec.ts`
- Modify: `services/management-api/src/app.module.ts`

### Passo 1: AuditService

- [ ] **1.1** Criar o DTO de auditoria:

```typescript
// src/shared/audit/dto/create-audit-log.dto.ts
export class CreateAuditLogDto {
  actorId: string;
  action: string;           // ex: 'tenant.created', 'contract.suspended'
  resourceType: string;     // ex: 'tenant', 'contract'
  resourceId: string;
  tenantId?: string;        // null para ações do superadmin
  metadata?: Record<string, unknown>;
}
```

- [ ] **1.2** Criar AuditService:

```typescript
// src/shared/audit/audit.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(dto: CreateAuditLogDto): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: dto.actorId,
          action: dto.action,
          resourceType: dto.resourceType,
          resourceId: dto.resourceId,
          tenantId: dto.tenantId ?? null,
          metadata: dto.metadata ?? {},
        },
      });
    } catch (err) {
      // Falha de auditoria não deve quebrar a operação principal
      this.logger.error(`Audit log failed: ${err.message}`, err.stack);
    }
  }
}
```

- [ ] **1.3** Criar AuditModule:

```typescript
// src/shared/audit/audit.module.ts
import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
```

### Passo 2: DTOs de Tenant

- [ ] **1.4** Criar DTOs:

```typescript
// src/admin/tenants/dto/create-tenant.dto.ts
import { IsString, Length, IsEnum } from 'class-validator';

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
}

export class CreateTenantDto {
  @IsString()
  city: string;

  @IsString()
  @Length(2, 2)
  state: string;
}
```

```typescript
// src/admin/tenants/dto/update-tenant.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateTenantDto, TenantStatus } from './create-tenant.dto';

export class UpdateTenantDto extends PartialType(CreateTenantDto) {
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;
}
```

### Passo 3: Escrever testes ANTES da implementação (TDD)

- [ ] **1.5** Escrever o arquivo de testes com casos que DEVEM FALHAR:

```typescript
// test/admin/tenants.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TenantsService } from '../../src/admin/tenants/tenants.service';
import { AuditService } from '../../src/shared/audit/audit.service';
import { PrismaService } from '../../src/prisma/prisma.service';

const prismaMock = {
  tenant: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  tenantMetric: {
    findMany: jest.fn(),
  },
  auditLog: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

const auditMock = { log: jest.fn() };

describe('TenantsService', () => {
  let service: TenantsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();
    service = module.get<TenantsService>(TenantsService);
  });

  describe('create', () => {
    it('should create a tenant and log audit', async () => {
      const dto = { city: 'São Paulo', state: 'SP' };
      const actorId = 'actor-uuid';
      prismaMock.tenant.create.mockResolvedValue({ id: 'uuid-1', ...dto, status: 'active' });

      const result = await service.create(dto, actorId);

      expect(prismaMock.tenant.create).toHaveBeenCalledWith({
        data: { city: dto.city, state: dto.state, status: 'active' },
      });
      expect(auditMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'tenant.created', actorId }),
      );
      expect(result.city).toBe('São Paulo');
    });

    it('should throw ConflictException on duplicate city/state (P2002)', async () => {
      prismaMock.tenant.create.mockRejectedValue({ code: 'P2002' });
      await expect(service.create({ city: 'Rio', state: 'RJ' }, 'actor')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return list of tenants', async () => {
      prismaMock.tenant.findMany.mockResolvedValue([{ id: 'uuid-1' }]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when tenant not found', async () => {
      prismaMock.tenant.findUnique.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update tenant and log audit', async () => {
      const existing = { id: 'uuid-1', city: 'SP', state: 'SP', status: 'active' };
      prismaMock.tenant.findUnique.mockResolvedValue(existing);
      prismaMock.tenant.update.mockResolvedValue({ ...existing, city: 'Santos' });

      const result = await service.update('uuid-1', { city: 'Santos' }, 'actor');
      expect(result.city).toBe('Santos');
      expect(auditMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'tenant.updated' }),
      );
    });
  });

  describe('deactivate', () => {
    it('should set status to inactive and log audit', async () => {
      prismaMock.tenant.findUnique.mockResolvedValue({ id: 'uuid-1', status: 'active' });
      prismaMock.tenant.update.mockResolvedValue({ id: 'uuid-1', status: 'inactive' });

      await service.deactivate('uuid-1', 'actor');
      expect(prismaMock.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'inactive' }) }),
      );
      expect(auditMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'tenant.deactivated' }),
      );
    });
  });

  describe('activate', () => {
    it('should set status to active and log audit (RF01.7)', async () => {
      prismaMock.tenant.findUnique.mockResolvedValue({ id: 'uuid-1', status: 'inactive' });
      prismaMock.tenant.update.mockResolvedValue({ id: 'uuid-1', status: 'active' });

      await service.activate('uuid-1', 'actor');
      expect(prismaMock.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'active' }) }),
      );
      expect(auditMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'tenant.activated' }),
      );
    });
  });
});
```

- [ ] **1.6** Rodar testes para confirmar que FALHAM (TenantsService não existe):

```bash
cd services/management-api && npx jest test/admin/tenants.service.spec.ts --no-coverage
```

Esperado: `Cannot find module '../../src/admin/tenants/tenants.service'`

### Passo 4: Implementar TenantsService

- [ ] **1.7** Criar TenantsService:

```typescript
// src/admin/tenants/tenants.service.ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateTenantDto, actorId: string) {
    try {
      const tenant = await this.prisma.tenant.create({
        data: { city: dto.city, state: dto.state, status: 'active' },
      });
      await this.audit.log({
        actorId,
        action: 'tenant.created',
        resourceType: 'tenant',
        resourceId: tenant.id,
        metadata: { city: dto.city, state: dto.state },
      });
      return tenant;
    } catch (err) {
      if (err.code === 'P2002') {
        throw new ConflictException(`Tenant for ${dto.city}/${dto.state} already exists`);
      }
      throw err;
    }
  }

  async findAll() {
    return this.prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException(`Tenant ${id} not found`);
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto, actorId: string) {
    const before = await this.findOne(id);
    const tenant = await this.prisma.tenant.update({ where: { id }, data: dto });
    await this.audit.log({
      actorId,
      action: 'tenant.updated',
      resourceType: 'tenant',
      resourceId: id,
      metadata: { before, after: dto },
    });
    return tenant;
  }

  async deactivate(id: string, actorId: string) {
    await this.findOne(id);
    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: { status: 'inactive' },
    });
    await this.audit.log({
      actorId,
      action: 'tenant.deactivated',
      resourceType: 'tenant',
      resourceId: id,
    });
    return tenant;
  }

  async activate(id: string, actorId: string) {
    await this.findOne(id);
    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: { status: 'active' },
    });
    await this.audit.log({
      actorId,
      action: 'tenant.activated',
      resourceType: 'tenant',
      resourceId: id,
    });
    return tenant;
  }

  async getAuditLogs(tenantId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where: { tenantId } }),
    ]);
    return { data: logs, total, page, limit };
  }
}
```

### Passo 5: Criar Controller e Module

- [ ] **1.8** Criar TenantsController:

```typescript
// src/admin/tenants/tenants.controller.ts
import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe,
  Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
@Controller('admin/tenants')
export class TenantsController {
  constructor(private readonly service: TenantsService) {}

  @Post()
  create(@Body() dto: CreateTenantDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.userId);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() user: any,
  ) {
    return this.service.update(id, dto, user.userId);
  }

  @Delete(':id')
  deactivate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.service.deactivate(id, user.userId);
  }

  @Patch(':id/activate')
  activate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.service.activate(id, user.userId);
  }

  @Get(':id/audit-logs')
  getAuditLogs(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.service.getAuditLogs(id, +page, +limit);
  }
}
```

- [ ] **1.9** Criar TenantsModule:

```typescript
// src/admin/tenants/tenants.module.ts
import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../../shared/audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
```

- [ ] **1.10** Adicionar TenantsModule ao AppModule:

```typescript
// src/app.module.ts — adicionar no array imports:
import { TenantsModule } from './admin/tenants/tenants.module';
// ... outros imports existentes
imports: [
  ConfigModule.forRoot({ ... }),
  PrismaModule,
  AuthModule,
  TenantsModule,  // ← adicionar
],
```

### Passo 6: Rodar testes + commit + deploy

- [ ] **1.11** Rodar testes e confirmar que PASSAM:

```bash
cd services/management-api && npx jest test/admin/tenants.service.spec.ts --no-coverage
```

Esperado: todos os testes `PASS`

- [ ] **1.12** Build para verificar compilação TypeScript:

```bash
cd services/management-api && npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **1.13** Commit:

```bash
git add services/management-api/src/shared/audit/ \
        services/management-api/src/admin/tenants/ \
        services/management-api/test/admin/tenants.service.spec.ts \
        services/management-api/src/app.module.ts
git commit -m "feat(management-api): add AuditService + Tenants CRUD (RF01)"
```

- [ ] **1.14** Deploy sprint 2.1 no Railway (usar skill `railway:use-railway`):

```
Deploy management-api → validar GET /admin/tenants retorna 401 (sem token)
```

---

## Task 2.2: Licenças (RF02)

**Files:**
- Create: `services/management-api/src/admin/licenses/dto/update-license.dto.ts`
- Create: `services/management-api/src/admin/licenses/licenses.service.ts`
- Create: `services/management-api/src/admin/licenses/licenses.controller.ts`
- Create: `services/management-api/src/admin/licenses/licenses.module.ts`
- Create: `services/management-api/test/admin/licenses.service.spec.ts`
- Modify: `services/management-api/src/app.module.ts`

- [ ] **2.1** Escrever testes ANTES:

```typescript
// test/admin/licenses.service.spec.ts
import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LicensesService } from '../../src/admin/licenses/licenses.service';
import { AuditService } from '../../src/shared/audit/audit.service';
import { PrismaService } from '../../src/prisma/prisma.service';

const prismaMock = {
  license: { findUnique: jest.fn(), update: jest.fn(), upsert: jest.fn() },
  contract: { findFirst: jest.fn() },
  user: { count: jest.fn() },
  vehicle: { count: jest.fn() },
};
const auditMock = { log: jest.fn() };

describe('LicensesService', () => {
  let service: LicensesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        LicensesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();
    service = module.get<LicensesService>(LicensesService);
  });

  describe('getLicense', () => {
    it('should return license for tenant', async () => {
      prismaMock.license.findUnique.mockResolvedValue({ tenantId: 't1', maxVehicles: 10 });
      const result = await service.getLicense('t1');
      expect(result.maxVehicles).toBe(10);
    });

    it('should throw NotFoundException if license not found', async () => {
      prismaMock.license.findUnique.mockResolvedValue(null);
      await expect(service.getLicense('bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateManual', () => {
    it('should throw BadRequestException when active contract exists', async () => {
      prismaMock.license.findUnique.mockResolvedValue({ tenantId: 't1' });
      prismaMock.contract.findFirst.mockResolvedValue({ id: 'c1', status: 'active' });
      await expect(
        service.updateManual('t1', { maxVehicles: 20 }, 'actor'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update license when no active contract', async () => {
      prismaMock.license.findUnique.mockResolvedValue({ tenantId: 't1', maxVehicles: 5 });
      prismaMock.contract.findFirst.mockResolvedValue(null);
      prismaMock.license.update.mockResolvedValue({ tenantId: 't1', maxVehicles: 20 });
      const result = await service.updateManual('t1', { maxVehicles: 20 }, 'actor');
      expect(result.maxVehicles).toBe(20);
      expect(auditMock.log).toHaveBeenCalled();
    });
  });

  describe('syncFromContract', () => {
    it('should upsert license from contract data', async () => {
      const contract = { id: 'c1', maxVehicles: 10, maxDrivers: 5, maxManagers: 2 };
      prismaMock.license.upsert.mockResolvedValue({ tenantId: 't1', maxVehicles: 10 });
      await service.syncFromContract('t1', contract as any);
      expect(prismaMock.license.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 't1' },
          update: expect.objectContaining({ maxVehicles: 10 }),
        }),
      );
    });
  });
});
```

- [ ] **2.2** Rodar para confirmar FALHA.

- [ ] **2.3** Criar DTO e LicensesService:

```typescript
// src/admin/licenses/dto/update-license.dto.ts
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateLicenseDto {
  @IsOptional() @IsInt() @Min(0) maxVehicles?: number;
  @IsOptional() @IsInt() @Min(0) maxDrivers?: number;
  @IsOptional() @IsInt() @Min(0) maxManagers?: number;
}
```

```typescript
// src/admin/licenses/licenses.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import { UpdateLicenseDto } from './dto/update-license.dto';

@Injectable()
export class LicensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getLicense(tenantId: string) {
    const license = await this.prisma.license.findUnique({ where: { tenantId } });
    if (!license) throw new NotFoundException(`License for tenant ${tenantId} not found`);
    return license;
  }

  async getUsage(tenantId: string) {
    const [license, vehicleCount, driverCount, managerCount] = await Promise.all([
      this.getLicense(tenantId),
      this.prisma.vehicle.count({ where: { tenantId, status: 'active' } }),
      this.prisma.user.count({ where: { tenantId, role: 'driver', status: 'active' } }),
      this.prisma.user.count({ where: { tenantId, role: 'manager', status: 'active' } }),
    ]);
    return {
      license,
      usage: {
        vehicles: { current: vehicleCount, max: license.maxVehicles },
        drivers: { current: driverCount, max: license.maxDrivers },
        managers: { current: managerCount, max: license.maxManagers },
      },
    };
  }

  async updateManual(tenantId: string, dto: UpdateLicenseDto, actorId: string) {
    await this.getLicense(tenantId);
    const activeContract = await this.prisma.contract.findFirst({
      where: { organization: { tenantId }, status: 'active' },
    });
    if (activeContract) {
      throw new BadRequestException(
        'Cannot manually update license while active contract exists',
      );
    }
    const license = await this.prisma.license.update({ where: { tenantId }, data: dto });
    await this.audit.log({
      actorId,
      action: 'license.updated_manual',
      resourceType: 'license',
      resourceId: tenantId,
      tenantId,
      metadata: dto,
    });
    return license;
  }

  async syncFromContract(
    tenantId: string,
    contract: { id: string; maxVehicles: number; maxDrivers: number; maxManagers: number },
  ) {
    return this.prisma.license.upsert({
      where: { tenantId },
      update: {
        maxVehicles: contract.maxVehicles,
        maxDrivers: contract.maxDrivers,
        maxManagers: contract.maxManagers,
        syncedFromContractId: contract.id,
        updatedAt: new Date(),
      },
      create: {
        tenantId,
        maxVehicles: contract.maxVehicles,
        maxDrivers: contract.maxDrivers,
        maxManagers: contract.maxManagers,
        syncedFromContractId: contract.id,
      },
    });
  }
}
```

- [ ] **2.4** Criar LicensesController:

```typescript
// src/admin/licenses/licenses.controller.ts
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';
import { LicensesService } from './licenses.service';
import { UpdateLicenseDto } from './dto/update-license.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
@Controller('admin/tenants/:tenantId/license')
export class LicensesController {
  constructor(private readonly service: LicensesService) {}

  @Get()
  getLicense(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.service.getLicense(tenantId);
  }

  @Get('usage')
  getUsage(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.service.getUsage(tenantId);
  }

  @Patch()
  updateManual(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: UpdateLicenseDto,
    @CurrentUser() user: any,
  ) {
    return this.service.updateManual(tenantId, dto, user.userId);
  }
}
```

- [ ] **2.5** Criar LicensesModule e adicionar ao AppModule:

```typescript
// src/admin/licenses/licenses.module.ts
import { Module } from '@nestjs/common';
import { LicensesController } from './licenses.controller';
import { LicensesService } from './licenses.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../../shared/audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [LicensesController],
  providers: [LicensesService],
  exports: [LicensesService],
})
export class LicensesModule {}
```

- [ ] **2.6** Rodar testes e confirmar PASS:

```bash
cd services/management-api && npx jest test/admin/licenses.service.spec.ts --no-coverage
```

- [ ] **2.7** Commit + deploy sprint 2.2:

```bash
git add services/management-api/src/admin/licenses/ \
        services/management-api/test/admin/licenses.service.spec.ts \
        services/management-api/src/app.module.ts
git commit -m "feat(management-api): add Licenses read/sync/manual-update (RF02)"
```

- [ ] **2.8** Deploy sprint 2.2 no Railway (usar skill `railway:use-railway`):

```
Deploy management-api → validar GET /admin/tenants/:id/license retorna 401 (sem token)
```

---

## Task 2.3: Módulos e habilitação por tenant (RF03)

**Files:**
- Create: `services/management-api/src/admin/modules/dto/upsert-module.dto.ts`
- Create: `services/management-api/src/admin/modules/dto/set-tenant-modules.dto.ts`
- Create: `services/management-api/src/admin/modules/modules.service.ts`
- Create: `services/management-api/src/admin/modules/modules.controller.ts`
- Create: `services/management-api/src/admin/modules/modules.module.ts`
- Create: `services/management-api/test/admin/modules.service.spec.ts`

- [ ] **3.1** Escrever testes ANTES:

```typescript
// test/admin/modules.service.spec.ts
import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ModulesService } from '../../src/admin/modules/modules.service';
import { AuditService } from '../../src/shared/audit/audit.service';
import { PrismaService } from '../../src/prisma/prisma.service';

const prismaMock = {
  module: { findMany: jest.fn(), upsert: jest.fn() },
  tenantModule: { findMany: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() },
  auditLog: { create: jest.fn() },
};
const auditMock = { log: jest.fn() };

describe('ModulesService', () => {
  let service: ModulesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ModulesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();
    service = module.get<ModulesService>(ModulesService);
  });

  describe('listModules', () => {
    it('should return all modules', async () => {
      prismaMock.module.findMany.mockResolvedValue([{ id: 'financeiro', name: 'Financeiro' }]);
      const result = await service.listModules();
      expect(result).toHaveLength(1);
    });
  });

  describe('setTenantModules', () => {
    it('should reject if required dependency is not enabled', async () => {
      // módulo 'mensagens' depende de 'notificacoes' (required)
      prismaMock.module.findMany.mockResolvedValue([
        { id: 'notificacoes', dependencies: [], dependencyType: null },
        {
          id: 'mensagens',
          dependencies: ['notificacoes'],
          dependencyType: 'required',
        },
      ]);
      await expect(
        service.setTenantModules('t1', { moduleIds: ['mensagens'] }, 'actor'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should enable modules when dependencies satisfied', async () => {
      prismaMock.module.findMany.mockResolvedValue([
        { id: 'notificacoes', dependencies: [], dependencyType: null },
        { id: 'mensagens', dependencies: ['notificacoes'], dependencyType: 'required' },
      ]);
      prismaMock.tenantModule.upsert.mockResolvedValue({});
      prismaMock.tenantModule.deleteMany.mockResolvedValue({});

      await service.setTenantModules('t1', { moduleIds: ['notificacoes', 'mensagens'] }, 'actor');

      expect(prismaMock.tenantModule.upsert).toHaveBeenCalledTimes(2);
      expect(auditMock.log).toHaveBeenCalled();
    });
  });
});
```

- [ ] **3.2** Rodar para confirmar FALHA.

- [ ] **3.3** Criar DTOs:

```typescript
// src/admin/modules/dto/upsert-module.dto.ts
import { IsString, IsArray, IsOptional, IsEnum } from 'class-validator';

export class UpsertModuleDto {
  @IsString() id: string;
  @IsString() name: string;
  @IsOptional() @IsArray() @IsString({ each: true }) dependencies?: string[];
  @IsOptional() @IsEnum(['required', 'exclusive_group']) dependencyType?: string;
}
```

```typescript
// src/admin/modules/dto/set-tenant-modules.dto.ts
import { IsArray, IsString } from 'class-validator';

export class SetTenantModulesDto {
  @IsArray()
  @IsString({ each: true })
  moduleIds: string[];
}
```

- [ ] **3.4** Criar ModulesService:

```typescript
// src/admin/modules/modules.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import { UpsertModuleDto } from './dto/upsert-module.dto';
import { SetTenantModulesDto } from './dto/set-tenant-modules.dto';

@Injectable()
export class ModulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listModules() {
    return this.prisma.module.findMany({ orderBy: { id: 'asc' } });
  }

  async upsertModule(dto: UpsertModuleDto) {
    return this.prisma.module.upsert({
      where: { id: dto.id },
      update: { name: dto.name, dependencies: dto.dependencies ?? [], dependencyType: dto.dependencyType ?? null },
      create: { id: dto.id, name: dto.name, dependencies: dto.dependencies ?? [], dependencyType: dto.dependencyType ?? null },
    });
  }

  async setTenantModules(tenantId: string, dto: SetTenantModulesDto, actorId: string) {
    const allModules = await this.prisma.module.findMany();
    const moduleMap = new Map(allModules.map((m) => [m.id, m]));
    const enabledSet = new Set(dto.moduleIds);

    // Validar dependências
    for (const modId of dto.moduleIds) {
      const mod = moduleMap.get(modId);
      if (!mod) continue;
      if (mod.dependencyType === 'required') {
        for (const dep of mod.dependencies as string[]) {
          if (!enabledSet.has(dep)) {
            throw new BadRequestException(
              `Module "${modId}" requires "${dep}" to be enabled`,
            );
          }
        }
      }
      if (mod.dependencyType === 'exclusive_group') {
        const conflicts = (mod.dependencies as string[]).filter(
          (dep) => dep !== modId && enabledSet.has(dep),
        );
        if (conflicts.length > 0) {
          throw new BadRequestException(
            `Module "${modId}" conflicts with: ${conflicts.join(', ')}`,
          );
        }
      }
    }

    // Desabilitar todos, depois habilitar os selecionados
    await this.prisma.tenantModule.deleteMany({ where: { tenantId } });

    for (const moduleId of dto.moduleIds) {
      await this.prisma.tenantModule.upsert({
        where: { tenantId_moduleId: { tenantId, moduleId } },
        update: { enabled: true, updatedAt: new Date() },
        create: { tenantId, moduleId, enabled: true },
      });
    }

    await this.audit.log({
      actorId,
      action: 'tenant.modules_updated',
      resourceType: 'tenant_module',
      resourceId: tenantId,
      tenantId,
      metadata: { moduleIds: dto.moduleIds },
    });

    return this.prisma.tenantModule.findMany({ where: { tenantId } });
  }

  async getTenantModules(tenantId: string) {
    return this.prisma.tenantModule.findMany({
      where: { tenantId },
      include: { module: true },
    });
  }
}
```

- [ ] **3.5** Criar controller, module, adicionar ao AppModule.

```typescript
// src/admin/modules/modules.controller.ts
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';
import { ModulesService } from './modules.service';
import { UpsertModuleDto } from './dto/upsert-module.dto';
import { SetTenantModulesDto } from './dto/set-tenant-modules.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
@Controller('admin')
export class ModulesController {
  constructor(private readonly service: ModulesService) {}

  @Get('modules')
  listModules() { return this.service.listModules(); }

  @Post('modules')
  upsertModule(@Body() dto: UpsertModuleDto) { return this.service.upsertModule(dto); }

  @Get('tenants/:tenantId/modules')
  getTenantModules(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.service.getTenantModules(tenantId);
  }

  @Put('tenants/:tenantId/modules')
  setTenantModules(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: SetTenantModulesDto,
    @CurrentUser() user: any,
  ) {
    return this.service.setTenantModules(tenantId, dto, user.userId);
  }
}
```

- [ ] **3.6** Rodar testes e confirmar PASS:

```bash
cd services/management-api && npx jest test/admin/modules.service.spec.ts --no-coverage
```

- [ ] **3.7** Commit + deploy sprint 2.3:

```bash
git add services/management-api/src/admin/modules/ \
        services/management-api/test/admin/modules.service.spec.ts
git commit -m "feat(management-api): add Modules CRUD + tenant module management with dep validation (RF03)"
```

---

## Task 2.4: Organizações (RF04)

**Files:**
- Create: `services/management-api/src/admin/organizations/dto/create-organization.dto.ts`
- Create: `services/management-api/src/admin/organizations/dto/update-organization.dto.ts`
- Create: `services/management-api/src/admin/organizations/organizations.service.ts`
- Create: `services/management-api/src/admin/organizations/organizations.controller.ts`
- Create: `services/management-api/src/admin/organizations/organizations.module.ts`
- Create: `services/management-api/test/admin/organizations.service.spec.ts`

- [ ] **4.1** Escrever testes ANTES:

```typescript
// test/admin/organizations.service.spec.ts
import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { OrganizationsService } from '../../src/admin/organizations/organizations.service';
import { AuditService } from '../../src/shared/audit/audit.service';
import { PrismaService } from '../../src/prisma/prisma.service';

const prismaMock = {
  organization: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  contract: { findFirst: jest.fn() },
};
const auditMock = { log: jest.fn() };

describe('OrganizationsService', () => {
  let service: OrganizationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();
    service = module.get<OrganizationsService>(OrganizationsService);
  });

  it('should create organization and log audit', async () => {
    const dto = { tenantId: 't1', razaoSocial: 'Empresa Ltda', cnpj: '12.345.678/0001-90', financialEmail: 'fin@empresa.com', billingAddress: {} };
    prismaMock.organization.findUnique.mockResolvedValue(null); // sem duplicata
    prismaMock.organization.create.mockResolvedValue({ id: 'org-1', ...dto });

    const result = await service.create(dto as any, 'actor');
    expect(result.id).toBe('org-1');
    expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'organization.created' }));
  });

  it('should throw ConflictException on P2002', async () => {
    prismaMock.organization.create.mockRejectedValue({ code: 'P2002' });
    await expect(service.create({ cnpj: '123' } as any, 'actor')).rejects.toThrow(ConflictException);
  });

  it('should throw BadRequestException on deactivate when active contract exists', async () => {
    prismaMock.organization.findUnique.mockResolvedValue({ id: 'org-1' });
    prismaMock.contract.findFirst.mockResolvedValue({ id: 'c1', status: 'active' });
    await expect(service.deactivate('org-1', 'actor')).rejects.toThrow(BadRequestException);
  });
});
```

- [ ] **4.2** Rodar para confirmar FALHA.

- [ ] **4.3** Criar DTOs + OrganizationsService:

```typescript
// src/admin/organizations/dto/create-organization.dto.ts
import { IsEmail, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateOrganizationDto {
  @IsUUID() tenantId: string;
  @IsString() razaoSocial: string;
  @IsString() cnpj: string;
  @IsEmail() financialEmail: string;
  @IsOptional() @IsObject() billingAddress?: Record<string, unknown>;
}
```

```typescript
// src/admin/organizations/dto/update-organization.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { OmitType } from '@nestjs/mapped-types';
import { CreateOrganizationDto } from './create-organization.dto';

export class UpdateOrganizationDto extends PartialType(
  OmitType(CreateOrganizationDto, ['tenantId'] as const),
) {}
```

```typescript
// src/admin/organizations/organizations.service.ts
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateOrganizationDto, actorId: string) {
    try {
      const org = await this.prisma.organization.create({
        data: {
          tenantId: dto.tenantId,
          razaoSocial: dto.razaoSocial,
          cnpj: dto.cnpj,
          financialEmail: dto.financialEmail,
          billingAddress: dto.billingAddress ?? {},
        },
      });
      await this.audit.log({ actorId, action: 'organization.created', resourceType: 'organization', resourceId: org.id, metadata: dto });
      return org;
    } catch (err) {
      if (err.code === 'P2002') throw new ConflictException('CNPJ or tenantId already in use');
      throw err;
    }
  }

  async findAll() {
    return this.prisma.organization.findMany({ include: { tenant: true }, orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const org = await this.prisma.organization.findUnique({ where: { id }, include: { tenant: true } });
    if (!org) throw new NotFoundException(`Organization ${id} not found`);
    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto, actorId: string) {
    const before = await this.findOne(id);
    const org = await this.prisma.organization.update({ where: { id }, data: dto });
    await this.audit.log({ actorId, action: 'organization.updated', resourceType: 'organization', resourceId: id, metadata: { before, after: dto } });
    return org;
  }

  async deactivate(id: string, actorId: string) {
    await this.findOne(id);
    const activeContract = await this.prisma.contract.findFirst({ where: { organizationId: id, status: 'active' } });
    if (activeContract) throw new BadRequestException('Cannot deactivate organization with active contract');
    // MVP LIMITATION: tabela `organizations` não possui campo `status` na modelagem atual.
    // Deactivation é registrada apenas como audit log. Follow-up: adicionar campo `status` em
    // migration futura se o produto exigir inativação explícita de organizações.
    await this.audit.log({ actorId, action: 'organization.deactivated', resourceType: 'organization', resourceId: id });
    return { id, message: 'Organization deactivation recorded in audit log' };
  }
}
```

- [ ] **4.4** Criar controller e module (seguir padrão de Tenants).

- [ ] **4.5** Rodar testes:

```bash
cd services/management-api && npx jest test/admin/organizations.service.spec.ts --no-coverage
```

- [ ] **4.6** Commit + deploy sprint 2.4:

```bash
git add services/management-api/src/admin/organizations/ \
        services/management-api/test/admin/organizations.service.spec.ts
git commit -m "feat(management-api): add Organizations CRUD (RF04)"
```

---

## Task 2.5: Contratos + efeitos colaterais (RF05)

**Files:**
- Create: `services/management-api/src/admin/contracts/dto/create-contract.dto.ts`
- Create: `services/management-api/src/admin/contracts/dto/update-contract-status.dto.ts`
- Create: `services/management-api/src/admin/contracts/contracts.service.ts`
- Create: `services/management-api/src/admin/contracts/contracts.controller.ts`
- Create: `services/management-api/src/admin/contracts/contracts.module.ts`
- Create: `services/management-api/test/admin/contracts.service.spec.ts`

> **Importante:** O service de contratos precisa de LicensesService (para syncFromContract). Injetar LicensesService via ContractsModule importar LicensesModule.

- [ ] **5.1** Escrever testes ANTES:

```typescript
// test/admin/contracts.service.spec.ts
import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContractsService } from '../../src/admin/contracts/contracts.service';
import { LicensesService } from '../../src/admin/licenses/licenses.service';
import { AuditService } from '../../src/shared/audit/audit.service';
import { PrismaService } from '../../src/prisma/prisma.service';

const prismaMock = {
  contract: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
  tenant: { update: jest.fn() },
  invoice: { create: jest.fn() },
  $transaction: jest.fn((fn) => fn(prismaMock)),
};
const licensesMock = { syncFromContract: jest.fn() };
const auditMock = { log: jest.fn() };

describe('ContractsService', () => {
  let service: ContractsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ContractsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: LicensesService, useValue: licensesMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();
    service = module.get<ContractsService>(ContractsService);
  });

  describe('create', () => {
    it('should reject if active contract already exists for organization', async () => {
      prismaMock.contract.findFirst.mockResolvedValue({ id: 'c1', status: 'active' });
      await expect(
        service.create({ organizationId: 'org1', monthlyValue: 500 } as any, 'actor'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create contract, generate first invoice, sync license', async () => {
      prismaMock.contract.findFirst.mockResolvedValue(null);
      const createdContract = {
        id: 'c1', organizationId: 'org1', monthlyValue: 500,
        maxVehicles: 10, maxDrivers: 5, maxManagers: 2,
        organization: { tenantId: 't1' },
      };
      prismaMock.contract.create.mockResolvedValue(createdContract);
      prismaMock.invoice.create.mockResolvedValue({ id: 'inv1' });
      licensesMock.syncFromContract.mockResolvedValue({});

      const result = await service.create({ organizationId: 'org1', monthlyValue: 500, maxVehicles: 10, maxDrivers: 5, maxManagers: 2, startsAt: '2026-04-01' } as any, 'actor');

      expect(prismaMock.invoice.create).toHaveBeenCalled();
      expect(licensesMock.syncFromContract).toHaveBeenCalledWith('t1', createdContract);
      expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'contract.created' }));
    });
  });

  describe('updateStatus', () => {
    it('should suspend tenant when contract is suspended', async () => {
      prismaMock.contract.findUnique.mockResolvedValue({
        id: 'c1', status: 'active', organization: { tenantId: 't1' },
      });
      prismaMock.contract.update.mockResolvedValue({ id: 'c1', status: 'suspended' });
      prismaMock.tenant.update.mockResolvedValue({});

      await service.updateStatus('c1', { status: 'suspended' }, 'actor');

      expect(prismaMock.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'suspended' } }),
      );
      expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'contract.suspended' }));
    });

    it('should terminate tenant when contract is terminated', async () => {
      prismaMock.contract.findUnique.mockResolvedValue({
        id: 'c1', status: 'active', organization: { tenantId: 't1' },
      });
      prismaMock.contract.update.mockResolvedValue({ id: 'c1', status: 'terminated' });
      prismaMock.tenant.update.mockResolvedValue({});

      await service.updateStatus('c1', { status: 'terminated' }, 'actor');

      expect(prismaMock.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'inactive' } }),
      );
    });
  });
});
```

- [ ] **5.2** Rodar para confirmar FALHA.

- [ ] **5.3** Criar DTOs:

```typescript
// src/admin/contracts/dto/create-contract.dto.ts
import { IsArray, IsDateString, IsDecimal, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateContractDto {
  @IsUUID() organizationId: string;
  @Type(() => Number) monthlyValue: number;
  @IsOptional() @IsArray() @IsString({ each: true }) modules?: string[];
  @IsInt() @Min(0) maxVehicles: number;
  @IsInt() @Min(0) maxDrivers: number;
  @IsInt() @Min(0) maxManagers: number;
  @IsDateString() startsAt: string;
  @IsOptional() @IsDateString() endsAt?: string;
}
```

```typescript
// src/admin/contracts/dto/update-contract-status.dto.ts
import { IsEnum } from 'class-validator';

export class UpdateContractStatusDto {
  @IsEnum(['active', 'suspended', 'terminated'])
  status: 'active' | 'suspended' | 'terminated';
}
```

- [ ] **5.4** Criar ContractsService:

```typescript
// src/admin/contracts/contracts.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import { LicensesService } from '../licenses/licenses.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractStatusDto } from './dto/update-contract-status.dto';

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly licenses: LicensesService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateContractDto, actorId: string) {
    const activeContract = await this.prisma.contract.findFirst({
      where: { organizationId: dto.organizationId, status: 'active' },
    });
    if (activeContract) {
      throw new BadRequestException('Organization already has an active contract');
    }

    // RF05.5 — contract + fatura atômicos via $transaction
    // RF05.6 — syncFromContract fora da tx (usa this.prisma separado; best-effort — não reverte o contrato se falhar)
    const contract = await this.prisma.$transaction(async (tx) => {
      const created = await tx.contract.create({
        data: {
          organizationId: dto.organizationId,
          monthlyValue: dto.monthlyValue,
          modules: dto.modules ?? [],
          maxVehicles: dto.maxVehicles,
          maxDrivers: dto.maxDrivers,
          maxManagers: dto.maxManagers,
          startsAt: new Date(dto.startsAt),
          endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
          status: 'active',
        },
        include: { organization: true },
      });

      // RF05.5 — gerar primeira fatura (mesma transação — deve ser atômica com o contrato)
      const today = new Date();
      const competenceMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      await tx.invoice.create({
        data: {
          contractId: created.id,
          competenceMonth,
          value: created.monthlyValue,
          status: 'pending',
        },
      });

      return created;
    });

    // RF05.6 — sincronizar licença FORA da $transaction (usa this.prisma; best-effort)
    await this.licenses.syncFromContract(contract.organization.tenantId, {
      id: contract.id,
      maxVehicles: contract.maxVehicles,
      maxDrivers: contract.maxDrivers,
      maxManagers: contract.maxManagers,
    });

    await this.audit.log({
      actorId,
      action: 'contract.created',
      resourceType: 'contract',
      resourceId: contract.id,
      metadata: dto,
    });
    return contract;
  }

  async findAll(organizationId?: string) {
    return this.prisma.contract.findMany({
      where: organizationId ? { organizationId } : undefined,
      include: { organization: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: { organization: true },
    });
    if (!contract) throw new NotFoundException(`Contract ${id} not found`);
    return contract;
  }

  async updateStatus(id: string, dto: UpdateContractStatusDto, actorId: string) {
    const contract = await this.findOne(id);

    // RF05.4 — efeitos colaterais no tenant + atualização do contrato em $transaction
    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.status === 'suspended') {
        await tx.tenant.update({
          where: { id: contract.organization.tenantId },
          data: { status: 'suspended' },
        });
      } else if (dto.status === 'terminated') {
        await tx.tenant.update({
          where: { id: contract.organization.tenantId },
          data: { status: 'inactive' },
        });
      }

      return tx.contract.update({
        where: { id },
        data: { status: dto.status },
      });
    });

    await this.audit.log({
      actorId,
      action: `contract.${dto.status}`,
      resourceType: 'contract',
      resourceId: id,
      metadata: { previousStatus: contract.status, newStatus: dto.status },
    });
    return updated;
  }
}
```

- [ ] **5.5** Criar ContractsController + ContractsModule (importa LicensesModule).

- [ ] **5.6** Rodar testes:

```bash
cd services/management-api && npx jest test/admin/contracts.service.spec.ts --no-coverage
```

- [ ] **5.7** Commit + deploy sprint 2.5:

```bash
git add services/management-api/src/admin/contracts/ \
        services/management-api/test/admin/contracts.service.spec.ts \
        services/management-api/src/app.module.ts
git commit -m "feat(management-api): add Contracts CRUD + side-effects in $transaction (suspend tenant, generate invoice, sync license) (RF05)"
```

---

## Task 2.6: Faturas (RF06)

**Files:**
- Create: `services/management-api/src/admin/invoices/dto/create-invoice.dto.ts`
- Create: `services/management-api/src/admin/invoices/dto/mark-paid.dto.ts`
- Create: `services/management-api/src/admin/invoices/dto/bulk-generate.dto.ts`
- Create: `services/management-api/src/admin/invoices/invoices.service.ts`
- Create: `services/management-api/src/admin/invoices/invoices.controller.ts`
- Create: `services/management-api/src/admin/invoices/invoices.module.ts`
- Create: `services/management-api/test/admin/invoices.service.spec.ts`

- [ ] **6.1** Escrever testes ANTES:

```typescript
// test/admin/invoices.service.spec.ts
import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { InvoicesService } from '../../src/admin/invoices/invoices.service';
import { AuditService } from '../../src/shared/audit/audit.service';
import { PrismaService } from '../../src/prisma/prisma.service';

const prismaMock = {
  invoice: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
  contract: { findMany: jest.fn() },
};
const auditMock = { log: jest.fn() };

describe('InvoicesService', () => {
  let service: InvoicesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();
    service = module.get<InvoicesService>(InvoicesService);
  });

  describe('create', () => {
    it('should throw ConflictException on duplicate competence month (P2002)', async () => {
      prismaMock.invoice.create.mockRejectedValue({ code: 'P2002' });
      await expect(
        service.create({ contractId: 'c1', competenceMonth: '2026-04-01', value: 500 }, 'actor'),
      ).rejects.toThrow(ConflictException);
    });

    it('should create invoice', async () => {
      prismaMock.invoice.create.mockResolvedValue({ id: 'inv1', status: 'pending' });
      const result = await service.create({ contractId: 'c1', competenceMonth: '2026-04-01', value: 500 }, 'actor');
      expect(result.id).toBe('inv1');
    });
  });

  describe('bulkGenerate', () => {
    it('should generate invoices for all active contracts', async () => {
      prismaMock.contract.findMany.mockResolvedValue([
        { id: 'c1', monthlyValue: 500 },
        { id: 'c2', monthlyValue: 300 },
      ]);
      prismaMock.invoice.findFirst.mockResolvedValue(null); // sem duplicatas
      prismaMock.invoice.create.mockResolvedValue({ id: 'inv1' });

      const result = await service.bulkGenerate({ competenceMonth: '2026-04-01' }, 'actor');
      expect(result.generated).toBe(2);
    });

    it('should skip contracts that already have invoice for competence month', async () => {
      prismaMock.contract.findMany.mockResolvedValue([{ id: 'c1', monthlyValue: 500 }]);
      prismaMock.invoice.findFirst.mockResolvedValue({ id: 'existing' }); // já existe
      prismaMock.invoice.create.mockResolvedValue({ id: 'inv1' });

      const result = await service.bulkGenerate({ competenceMonth: '2026-04-01' }, 'actor');
      expect(result.generated).toBe(0);
      expect(result.skipped).toBe(1);
    });
  });

  describe('markPaid', () => {
    it('should mark invoice as paid', async () => {
      prismaMock.invoice.findUnique.mockResolvedValue({ id: 'inv1', status: 'pending' });
      prismaMock.invoice.update.mockResolvedValue({ id: 'inv1', status: 'paid' });

      const result = await service.markPaid('inv1', 'actor');
      expect(prismaMock.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'paid', paidBy: 'actor' }),
        }),
      );
    });
  });
});
```

- [ ] **6.2** Rodar para confirmar FALHA.

- [ ] **6.3** Criar DTOs + InvoicesService:

```typescript
// src/admin/invoices/dto/create-invoice.dto.ts
import { IsDateString, IsNumber, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceDto {
  @IsUUID() contractId: string;
  @IsDateString() competenceMonth: string;
  @Type(() => Number) @IsNumber() @Min(0) value: number;
}
```

```typescript
// src/admin/invoices/dto/bulk-generate.dto.ts
import { IsDateString } from 'class-validator';

export class BulkGenerateDto {
  @IsDateString()
  competenceMonth: string; // ex: '2026-04-01'
}
```

```typescript
// src/admin/invoices/invoices.service.ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { BulkGenerateDto } from './dto/bulk-generate.dto';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateInvoiceDto, actorId: string) {
    try {
      const invoice = await this.prisma.invoice.create({
        data: {
          contractId: dto.contractId,
          competenceMonth: new Date(dto.competenceMonth),
          value: dto.value,
          status: 'pending',
        },
      });
      await this.audit.log({ actorId, action: 'invoice.created', resourceType: 'invoice', resourceId: invoice.id, metadata: dto });
      return invoice;
    } catch (err) {
      if (err.code === 'P2002') throw new ConflictException('Invoice already exists for this contract and competence month');
      throw err;
    }
  }

  async bulkGenerate(dto: BulkGenerateDto, actorId: string) {
    const activeContracts = await this.prisma.contract.findMany({ where: { status: 'active' } });
    const competenceMonth = new Date(dto.competenceMonth);
    let generated = 0;
    let skipped = 0;

    for (const contract of activeContracts) {
      const exists = await this.prisma.invoice.findFirst({
        where: { contractId: contract.id, competenceMonth },
      });
      if (exists) { skipped++; continue; }

      await this.prisma.invoice.create({
        data: { contractId: contract.id, competenceMonth, value: contract.monthlyValue, status: 'pending' },
      });
      generated++;
    }

    await this.audit.log({ actorId, action: 'invoice.bulk_generated', resourceType: 'invoice', resourceId: dto.competenceMonth, metadata: { generated, skipped } });
    return { generated, skipped, competenceMonth: dto.competenceMonth };
  }

  async findAll(filters?: { status?: string; contractId?: string }) {
    return this.prisma.invoice.findMany({
      where: filters,
      include: { contract: { include: { organization: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);
    return invoice;
  }

  async markPaid(id: string, actorId: string) {
    await this.findOne(id);
    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: { status: 'paid', paidAt: new Date(), paidBy: actorId },
    });
    await this.audit.log({ actorId, action: 'invoice.paid', resourceType: 'invoice', resourceId: id });
    return invoice;
  }

  async cancel(id: string, actorId: string) {
    await this.findOne(id);
    const invoice = await this.prisma.invoice.update({ where: { id }, data: { status: 'cancelled' } });
    await this.audit.log({ actorId, action: 'invoice.cancelled', resourceType: 'invoice', resourceId: id });
    return invoice;
  }
}
```

- [ ] **6.4** Criar controller, module e adicionar ao AppModule.

- [ ] **6.5** Rodar testes:

```bash
cd services/management-api && npx jest test/admin/invoices.service.spec.ts --no-coverage
```

- [ ] **6.6** Commit + deploy sprint 2.6:

```bash
git add services/management-api/src/admin/invoices/ \
        services/management-api/test/admin/invoices.service.spec.ts
git commit -m "feat(management-api): add Invoices CRUD + bulk generate + mark paid/cancel (RF06)"
```

---

## Task 2.7: Dashboard Admin (RF07)

**Files:**
- Create: `services/management-api/src/admin/dashboard/dashboard.service.ts`
- Create: `services/management-api/src/admin/dashboard/dashboard.controller.ts`
- Create: `services/management-api/src/admin/dashboard/dashboard.module.ts`
- Create: `services/management-api/test/admin/dashboard.service.spec.ts`

- [ ] **7.1** Escrever testes ANTES:

```typescript
// test/admin/dashboard.service.spec.ts
import { Test } from '@nestjs/testing';
import { DashboardService } from '../../src/admin/dashboard/dashboard.service';
import { PrismaService } from '../../src/prisma/prisma.service';

const now = new Date();
const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

const prismaMock = {
  tenant: { count: jest.fn() },
  contract: { count: jest.fn(), aggregate: jest.fn(), findMany: jest.fn() },
  invoice: { count: jest.fn(), aggregate: jest.fn() },
  license: { findMany: jest.fn() },
  $queryRaw: jest.fn(),
};

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get<DashboardService>(DashboardService);
  });

  it('should return general KPIs', async () => {
    prismaMock.tenant.count.mockResolvedValue(10);
    prismaMock.$queryRaw.mockResolvedValue([{ count: BigInt(3) }]); // alertas: tenants near limit
    prismaMock.tenant.count.mockResolvedValueOnce(10).mockResolvedValueOnce(2); // active + inactive 30d

    const result = await service.getKpis();
    expect(result).toHaveProperty('tenantsActive');
  });

  it('should return commercial KPIs', async () => {
    prismaMock.contract.count.mockResolvedValue(8);
    prismaMock.contract.aggregate.mockResolvedValue({ _sum: { monthlyValue: 4000 } });
    prismaMock.invoice.count.mockResolvedValue(3);
    prismaMock.contract.findMany.mockResolvedValue([]);

    const result = await service.getCommercialKpis();
    expect(result).toHaveProperty('activeContracts');
    expect(result).toHaveProperty('monthlyRevenue');
  });
});
```

- [ ] **7.2** Rodar para confirmar FALHA.

- [ ] **7.3** Criar DashboardService:

```typescript
// src/admin/dashboard/dashboard.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getKpis() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [tenantsActive, tenantsNewLast30d, tenantsSuspended] = await Promise.all([
      this.prisma.tenant.count({ where: { status: 'active' } }),
      this.prisma.tenant.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.tenant.count({ where: { status: 'suspended' } }),
    ]);

    return {
      tenantsActive,
      tenantsNewLast30d,
      tenantsSuspended,
      alerts: tenantsSuspended, // anomalia: tenants suspensos
    };
  }

  async getCommercialKpis() {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [activeContracts, revenueAgg, pendingInvoices, expiringContracts] = await Promise.all([
      this.prisma.contract.count({ where: { status: 'active' } }),
      this.prisma.contract.aggregate({
        where: { status: 'active' },
        _sum: { monthlyValue: true },
      }),
      this.prisma.invoice.count({ where: { status: 'pending' } }),
      this.prisma.contract.findMany({
        where: { status: 'active', endsAt: { lte: thirtyDaysFromNow, not: null } },
        include: { organization: { include: { tenant: true } } },
        orderBy: { endsAt: 'asc' },
        take: 10,
      }),
    ]);

    return {
      activeContracts,
      monthlyRevenue: revenueAgg._sum.monthlyValue ?? 0,
      pendingInvoices,
      expiringContracts,
    };
  }

  async getTenantUsage() {
    // Prisma gera relação singular `license` (não `licenses`) devido ao UNIQUE(tenant_id)
    const tenants = await this.prisma.tenant.findMany({
      where: { status: 'active' },
      include: { license: true },
    });

    return tenants.map((t) => ({
      tenantId: t.id,
      city: t.city,
      state: t.state,
      license: t.license ?? null,
    }));
  }
}
```

- [ ] **7.4** Criar DashboardController + DashboardModule.

```typescript
// src/admin/dashboard/dashboard.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { DashboardService } from './dashboard.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get()
  getKpis() { return this.service.getKpis(); }

  @Get('commercial')
  getCommercialKpis() { return this.service.getCommercialKpis(); }

  @Get('tenant-usage')
  getTenantUsage() { return this.service.getTenantUsage(); }
}
```

- [ ] **7.5** Rodar testes:

```bash
cd services/management-api && npx jest test/admin/dashboard.service.spec.ts --no-coverage
```

- [ ] **7.6** Commit + deploy sprint 2.7:

```bash
git add services/management-api/src/admin/dashboard/ \
        services/management-api/test/admin/dashboard.service.spec.ts
git commit -m "feat(management-api): add Dashboard Admin KPIs (RF07)"
```

---

## Task 2.8: Convites de Gestor (RF20.2)

**Files:**
- Create: `services/management-api/src/admin/invites/dto/create-invite.dto.ts`
- Create: `services/management-api/src/admin/invites/invites.service.ts`
- Create: `services/management-api/src/admin/invites/invites.controller.ts`
- Create: `services/management-api/src/admin/invites/invites.module.ts`
- Create: `services/management-api/test/admin/invites.service.spec.ts`

> **Cross-schema:** `invite_tokens` está no schema `app`. A management-api usa `prisma.$queryRaw` para inserir e consultar.

- [ ] **8.1** Escrever testes ANTES:

```typescript
// test/admin/invites.service.spec.ts
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { InvitesService } from '../../src/admin/invites/invites.service';
import { AuditService } from '../../src/shared/audit/audit.service';
import { PrismaService } from '../../src/prisma/prisma.service';

const prismaMock = {
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
};
const auditMock = { log: jest.fn() };

describe('InvitesService', () => {
  let service: InvitesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        InvitesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();
    service = module.get<InvitesService>(InvitesService);
  });

  describe('generateManagerInvite', () => {
    it('should insert into app.invite_tokens via $queryRaw', async () => {
      prismaMock.$queryRaw.mockResolvedValue([{ id: 'inv-uuid', token: 'tok123' }]);

      const result = await service.generateManagerInvite({ tenantId: 't1', email: 'g@x.com' }, 'actor');

      expect(prismaMock.$queryRaw).toHaveBeenCalled();
      expect(result).toHaveProperty('token');
    });
  });

  describe('resendInvite', () => {
    it('should throw NotFoundException if invite not found', async () => {
      prismaMock.$queryRaw.mockResolvedValue([]); // não encontrou
      await expect(service.resendInvite('bad-id', 'actor')).rejects.toThrow(NotFoundException);
    });

    it('should update expires_at on resend', async () => {
      prismaMock.$queryRaw.mockResolvedValue([{ id: 'inv-1', token: 'tok123', used_at: null }]);
      prismaMock.$executeRaw.mockResolvedValue(1);

      await service.resendInvite('inv-1', 'actor');
      expect(prismaMock.$executeRaw).toHaveBeenCalled();
    });
  });
});
```

- [ ] **8.2** Rodar para confirmar FALHA.

- [ ] **8.3** Criar DTO + InvitesService:

```typescript
// src/admin/invites/dto/create-invite.dto.ts
import { IsEmail, IsOptional, IsUUID } from 'class-validator';

export class CreateInviteDto {
  @IsUUID() tenantId: string;
  @IsOptional() @IsEmail() email?: string;
}
```

```typescript
// src/admin/invites/invites.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async generateManagerInvite(dto: CreateInviteDto, actorId: string) {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    // Cross-schema: escreve em app.invite_tokens via $queryRaw
    const result = await this.prisma.$queryRaw<{ id: string; token: string }[]>`
      INSERT INTO app.invite_tokens (id, tenant_id, token, role, email, expires_at, created_by)
      VALUES (
        gen_random_uuid(),
        ${dto.tenantId}::uuid,
        ${token},
        'manager',
        ${dto.email ?? null},
        ${expiresAt},
        ${actorId}::uuid
      )
      RETURNING id, token, expires_at
    `;

    await this.audit.log({
      actorId,
      action: 'invite.manager_created',
      resourceType: 'invite_token',
      resourceId: result[0].id,
      metadata: { tenantId: dto.tenantId, email: dto.email },
    });

    return result[0];
  }

  async resendInvite(inviteId: string, actorId: string) {
    const existing = await this.prisma.$queryRaw<{ id: string; token: string; used_at: Date | null }[]>`
      SELECT id, token, used_at FROM app.invite_tokens WHERE id = ${inviteId}::uuid
    `;
    if (!existing.length) throw new NotFoundException(`Invite ${inviteId} not found`);
    if (existing[0].used_at) throw new NotFoundException('Invite already used');

    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.$executeRaw`
      UPDATE app.invite_tokens
      SET expires_at = ${newExpiresAt}
      WHERE id = ${inviteId}::uuid
    `;

    await this.audit.log({
      actorId,
      action: 'invite.resent',
      resourceType: 'invite_token',
      resourceId: inviteId,
    });

    return { id: inviteId, token: existing[0].token, expiresAt: newExpiresAt };
  }

  async listByTenant(tenantId: string) {
    return this.prisma.$queryRaw<{ id: string; email: string; expires_at: Date; used_at: Date | null }[]>`
      SELECT id, email, expires_at, used_at, created_by
      FROM app.invite_tokens
      WHERE tenant_id = ${tenantId}::uuid AND role = 'manager'
      ORDER BY expires_at DESC
    `;
  }
}
```

- [ ] **8.4** Criar InvitesController + InvitesModule.

```typescript
// src/admin/invites/invites.controller.ts
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';
import { InvitesService } from './invites.service';
import { CreateInviteDto } from './dto/create-invite.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
@Controller('admin/invites')
export class InvitesController {
  constructor(private readonly service: InvitesService) {}

  @Post()
  generate(@Body() dto: CreateInviteDto, @CurrentUser() user: any) {
    return this.service.generateManagerInvite(dto, user.userId);
  }

  @Post(':id/resend')
  resend(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.service.resendInvite(id, user.userId);
  }

  @Get('tenant/:tenantId')
  listByTenant(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.service.listByTenant(tenantId);
  }
}
```

- [ ] **8.5** Rodar testes:

```bash
cd services/management-api && npx jest test/admin/invites.service.spec.ts --no-coverage
```

- [ ] **8.6** Rodar todos os testes da management-api para verificar ausência de regressões:

```bash
cd services/management-api && npx jest --no-coverage
```

- [ ] **8.7** Build final:

```bash
cd services/management-api && npx tsc --noEmit
```

- [ ] **8.8** Commit + deploy sprint 2.8:

```bash
git add services/management-api/src/admin/invites/ \
        services/management-api/test/admin/invites.service.spec.ts
git commit -m "feat(management-api): add Manager Invites with cross-schema app.invite_tokens (RF20.2)"
```

- [ ] **8.9** Deploy final da Fase 2 no Railway (usar skill `railway:use-railway`):

```
Deploy management-api → validar:
  GET  /health               → 200
  POST /admin/tenants        → 401 (sem token)
  GET  /admin/dashboard      → 401 (sem token)
  POST /admin/invites        → 401 (sem token)
```

---

## Definição de pronto da Fase 2

- [ ] Todos os testes passam: `cd services/management-api && npx jest --no-coverage`
- [ ] Build limpo: `npx tsc --noEmit`
- [ ] `GET /health` retorna 200 em produção
- [ ] Todos os endpoints retornam 401 sem token JWT válido
- [ ] `POST /admin/tenants` com token superadmin cria tenant e registra audit log
- [ ] `POST /admin/contracts` cria contrato + gera fatura + sincroniza licença em uma única operação
- [ ] `POST /admin/invites` cria invite em `app.invite_tokens` via cross-schema
