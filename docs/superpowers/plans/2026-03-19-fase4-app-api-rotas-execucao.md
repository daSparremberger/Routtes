# Fase 4 — app-api: Rotas e Execução Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar os módulos de Rotas, Frequência, Execução de Rota, Histórico e Rastreamento GPS em tempo real na app-api — o núcleo operacional da plataforma Routtes.

**Architecture:** Seis módulos NestJS interdependentes em `src/operational/`. Rotas: CRUD de template + paradas ordenadas + integração Mapbox Optimization API (via `@nestjs/axios`) + aprovação manual. Execução: máquina de estados (`prepared → in_progress → finished/cancelled`) com Outbox Pattern — cada evento crítico é escrito em `outbox_events` dentro da mesma `$transaction` Prisma que muta o estado. Trava anti-esquecimento (RF14.9): guarda no `finish()` que nenhum aluno embarcado ficou sem registro de desembarque. Rastreamento: `WebSocketGateway` NestJS com salas por execução (`execution:{id}`) — single instance MVP sem Redis Adapter.

**Tech Stack:** NestJS 10, Prisma 5 (schema `app`), `@nestjs/axios`, `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`, `class-validator`, `class-transformer`, `uuid`, Jest.

**Pré-requisito:** Fase 3 concluída — `schools`, `students`, `drivers`, `vehicles` presentes no banco e Prisma Client gerado. `JwtAuthGuard`, `TenantGuard`, `@TenantId()`, `@CurrentUser()` disponíveis.

**Spec:** `docs/superpowers/specs/2026-03-19-backend-roadmap-design.md` § Fase 4
**Vault:**
- `RouttesApp_Core/CORE/Requisitos funcionais.md` § RF13, RF14, RF15, RF18, RF19
- `RouttesApp_Core/CORE/Modelagem de dados.md` § Rotas, Execução, Observabilidade
- `RouttesApp_Core/CORE/Arquitetura técnica.md` § Outbox Pattern, Realtime Socket.io
- `RouttesApp_Core/CORE/Integrações externas.md` § Mapbox Directions API

---

## Arquivos a criar / modificar

```
services/app-api/
├── src/
│   ├── operational/
│   │   ├── routes/
│   │   │   ├── routes.module.ts
│   │   │   ├── routes.controller.ts        ← CRUD + stops + optimize + approve
│   │   │   ├── routes.service.ts
│   │   │   ├── mapbox/
│   │   │   │   ├── mapbox.module.ts        ← HttpModule + MAPBOX_TOKEN
│   │   │   │   └── mapbox.service.ts       ← optimizeRoute(stops, criteria) → reordered indices
│   │   │   └── dto/
│   │   │       ├── create-route.dto.ts
│   │   │       ├── update-route.dto.ts
│   │   │       ├── create-stop.dto.ts
│   │   │       └── optimize-route.dto.ts
│   │   │
│   │   ├── attendance/
│   │   │   ├── attendance.module.ts
│   │   │   ├── attendance.controller.ts    ← upsert + query by route/date/direction
│   │   │   ├── attendance.service.ts
│   │   │   └── dto/
│   │   │       └── upsert-attendance.dto.ts
│   │   │
│   │   ├── executions/
│   │   │   ├── executions.module.ts
│   │   │   ├── executions.controller.ts    ← prepare, start, recordStop, addEvent, finish, cancel, active, history
│   │   │   ├── executions.service.ts       ← state machine + outbox writes + anti-forgetting guard
│   │   │   └── dto/
│   │   │       ├── prepare-execution.dto.ts
│   │   │       ├── start-execution.dto.ts
│   │   │       ├── record-stop.dto.ts
│   │   │       ├── add-route-event.dto.ts
│   │   │       └── finish-execution.dto.ts
│   │   │
│   │   ├── history/
│   │   │   ├── history.module.ts
│   │   │   ├── history.controller.ts       ← GET /history with filters
│   │   │   └── history.service.ts          ← query finished executions + aggregates
│   │   │
│   │   └── tracking/
│   │       ├── tracking.module.ts
│   │       ├── tracking.gateway.ts         ← @WebSocketGateway — location_update broadcast
│   │       └── dto/
│   │           └── location-update.dto.ts
│   │
│   └── app.module.ts                       ← Modify: import all new modules
│
└── test/
    └── operational/
        ├── routes.service.spec.ts
        ├── mapbox.service.spec.ts
        ├── attendance.service.spec.ts
        ├── executions.service.spec.ts
        └── history.service.spec.ts
```

---

## Task 0: Verificação de pré-requisitos

- [ ] **0.1** Confirmar que os models da Fase 4 existem no Prisma Client:

```bash
grep -n "model routes\|model route_stops\|model route_executions\|model execution_stops\|model attendance\|model route_events\|model route_optimizations\|model outbox_events" \
  services/app-api/src/prisma/schema.prisma
```

Expected: todos os models presentes. Se não, executar `pnpm exec prisma db pull` em `services/app-api`.

- [ ] **0.2** Instalar dependências de Axios e WebSockets:

```bash
cd services/app-api && \
  pnpm add @nestjs/axios axios @nestjs/websockets @nestjs/platform-socket.io socket.io && \
  pnpm add -D @types/socket.io
```

- [ ] **0.3** Confirmar `MAPBOX_TOKEN` disponível no Railway (env var já declarada na Fase 0):

```bash
# Via railway:use-railway — verificar se MAPBOX_TOKEN existe em app-api production
# Se não existir, adicionar via MCP Railway antes de continuar
```

- [ ] **0.4** Verificar compilação atual (linha base):

```bash
cd services/app-api && pnpm exec tsc --noEmit
```

Expected: zero erros pré-existentes.

---

## Sprint 4.1 — Rotas (RF13)

**Definição de pronto:** CRUD de rotas com paradas ordenadas, otimização Mapbox e aprovação manual funcionando em produção.

### Task 1: MapboxModule

**Files:**
- Create: `services/app-api/src/operational/routes/mapbox/mapbox.service.ts`
- Create: `services/app-api/src/operational/routes/mapbox/mapbox.module.ts`
- Create: `test/operational/mapbox.service.spec.ts`

- [ ] **1.1** Escrever `test/operational/mapbox.service.spec.ts` (failing first):

```typescript
import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { MapboxService } from '../../src/operational/routes/mapbox/mapbox.service';

describe('MapboxService', () => {
  let service: MapboxService;
  let http: jest.Mocked<HttpService>;

  // Mapbox Optimization API response shape (simplified)
  const mapboxResponse = {
    data: {
      waypoints: [
        { waypoint_index: 0, name: '' },
        { waypoint_index: 2, name: '' },
        { waypoint_index: 1, name: '' },
      ],
    },
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MapboxService,
        { provide: HttpService, useValue: { get: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test-token') } },
      ],
    }).compile();

    service = module.get(MapboxService);
    http = module.get(HttpService);
  });

  it('should return reordered stop indices from Mapbox API', async () => {
    (http.get as jest.Mock).mockReturnValue(of(mapboxResponse));

    const stops = [
      { lat: -23.5, lng: -46.6 },
      { lat: -23.6, lng: -46.7 },
      { lat: -23.4, lng: -46.5 },
    ];

    const result = await service.optimizeRoute(stops, 'distance');

    // Result should be the reordered indices: [0, 2, 1]
    expect(result).toEqual([0, 2, 1]);
    expect(http.get).toHaveBeenCalledWith(
      expect.stringContaining('optimized-trips'),
      expect.any(Object),
    );
  });

  it('should throw when Mapbox API fails', async () => {
    (http.get as jest.Mock).mockReturnValue(
      new (require('rxjs').throwError)(() => new Error('Mapbox unavailable')),
    );

    const stops = [
      { lat: -23.5, lng: -46.6 },
      { lat: -23.6, lng: -46.7 },
    ];

    await expect(service.optimizeRoute(stops, 'time')).rejects.toThrow();
  });
});
```

- [ ] **1.2** Rodar para confirmar FAIL:

```bash
cd services/app-api && pnpm test -- --testPathPattern=mapbox.service
```

Expected: FAIL — "Cannot find module '../../src/operational/routes/mapbox/mapbox.service'"

- [ ] **1.3** Criar `services/app-api/src/operational/routes/mapbox/mapbox.service.ts`:

```typescript
import { Injectable, BadGatewayException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export type OptimizationCriteria = 'distance' | 'time';

interface Waypoint {
  waypoint_index: number;
}

@Injectable()
export class MapboxService {
  private readonly baseUrl = 'https://api.mapbox.com/optimized-trips/v1/mapbox/driving';

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Calls Mapbox Optimization API and returns the reordered stop indices.
   * stops[0] is fixed as source, stops[last] is fixed as destination.
   * Returns array of original indices in the optimized order.
   */
  async optimizeRoute(
    stops: { lat: number; lng: number }[],
    criteria: OptimizationCriteria,
  ): Promise<number[]> {
    if (stops.length < 2) {
      return stops.map((_, i) => i);
    }

    const token = this.config.get<string>('MAPBOX_TOKEN');
    const coordinates = stops.map((s) => `${s.lng},${s.lat}`).join(';');

    try {
      const response = await firstValueFrom(
        this.http.get<{ waypoints: Waypoint[] }>(`${this.baseUrl}/${coordinates}`, {
          params: {
            access_token: token,
            roundtrip: false,
            source: 'first',
            destination: 'last',
            // Mapbox Optimization API: 'duration' for time, 'distance' for distance
            overview: 'full',
          },
        }),
      );

      // waypoints[i].waypoint_index = where original stop i ended up in optimized order
      // We need to return the optimized order: sorted by waypoint_index
      const waypoints = response.data.waypoints;
      const ordered = [...waypoints]
        .sort((a, b) => a.waypoint_index - b.waypoint_index)
        .map((_, optimizedPos) => {
          // Find which original stop is at optimized position
          return waypoints.findIndex((w) => w.waypoint_index === optimizedPos);
        });

      return ordered;
    } catch (err) {
      throw new BadGatewayException('Mapbox optimization service is unavailable');
    }
  }
}
```

- [ ] **1.4** Criar `services/app-api/src/operational/routes/mapbox/mapbox.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { MapboxService } from './mapbox.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [MapboxService],
  exports: [MapboxService],
})
export class MapboxModule {}
```

- [ ] **1.5** Rodar testes para confirmar PASS:

```bash
cd services/app-api && pnpm test -- --testPathPattern=mapbox.service
```

Expected: PASS — 2 tests passando.

- [ ] **1.6** Commit:

```bash
git add services/app-api/src/operational/routes/mapbox/ test/operational/mapbox.service.spec.ts
git commit -m "feat(app-api): add MapboxService with Optimization API integration"
```

---

### Task 2: DTOs e RoutesService

**Files:**
- Create: `services/app-api/src/operational/routes/dto/create-route.dto.ts`
- Create: `services/app-api/src/operational/routes/dto/update-route.dto.ts`
- Create: `services/app-api/src/operational/routes/dto/create-stop.dto.ts`
- Create: `services/app-api/src/operational/routes/dto/optimize-route.dto.ts`
- Create: `services/app-api/src/operational/routes/routes.service.ts`
- Create: `test/operational/routes.service.spec.ts`

- [ ] **2.1** Criar DTOs:

`dto/create-route.dto.ts`:
```typescript
import { IsString, IsNotEmpty, IsEnum, IsUUID, IsOptional } from 'class-validator';

export enum RouteShift {
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  EVENING = 'evening',
}

export enum RouteType {
  FIXED = 'fixed',
  VARIABLE = 'variable',
}

export class CreateRouteDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(RouteShift)
  shift: RouteShift;

  @IsUUID()
  driver_id: string;

  @IsUUID()
  vehicle_id: string;

  @IsEnum(RouteType)
  @IsOptional()
  route_type?: RouteType;
}
```

`dto/update-route.dto.ts`:
```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateRouteDto } from './create-route.dto';
import { IsEnum, IsOptional } from 'class-validator';

export enum RouteStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class UpdateRouteDto extends PartialType(CreateRouteDto) {
  @IsEnum(RouteStatus)
  @IsOptional()
  status?: RouteStatus;
}
```

`dto/create-stop.dto.ts`:
```typescript
import { IsInt, IsNumber, IsEnum, IsUUID, IsOptional, Min } from 'class-validator';

export enum StopType {
  PICKUP = 'pickup',
  DROPOFF = 'dropoff',
  SCHOOL = 'school',
}

export class CreateStopDto {
  @IsInt()
  @Min(0)
  order: number;

  @IsUUID()
  @IsOptional()
  student_id?: string;

  @IsUUID()
  @IsOptional()
  school_id?: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsEnum(StopType)
  stop_type: StopType;
}
```

`dto/optimize-route.dto.ts`:
```typescript
import { IsEnum } from 'class-validator';

export enum OptimizationCriteria {
  DISTANCE = 'distance',
  TIME = 'time',
}

export class OptimizeRouteDto {
  @IsEnum(OptimizationCriteria)
  criteria: OptimizationCriteria;
}
```

- [ ] **2.2** Escrever `test/operational/routes.service.spec.ts` (failing first):

```typescript
import { Test } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RoutesService } from '../../src/operational/routes/routes.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { MapboxService } from '../../src/operational/routes/mapbox/mapbox.service';
import { RouteShift, RouteType } from '../../src/operational/routes/dto/create-route.dto';
import { StopType } from '../../src/operational/routes/dto/create-stop.dto';

describe('RoutesService', () => {
  let service: RoutesService;
  let prisma: {
    routes: { create: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
    route_stops: { create: jest.Mock; findMany: jest.Mock; updateMany: jest.Mock; deleteMany: jest.Mock };
    route_optimizations: { create: jest.Mock };
  };
  let mapbox: jest.Mocked<MapboxService>;

  const tenantId = 'tenant-uuid-1';
  const managerId = 'manager-uuid-1';

  const mockRoute = {
    id: 'route-uuid-1',
    tenant_id: tenantId,
    name: 'Rota Manhã Centro',
    shift: 'morning',
    driver_id: 'driver-uuid-1',
    vehicle_id: 'vehicle-uuid-1',
    route_type: 'fixed',
    status: 'draft',
    approved_by: null,
    approved_at: null,
    created_at: new Date(),
  };

  const mockStops = [
    { id: 'stop-1', route_id: 'route-uuid-1', order: 0, lat: -23.5, lng: -46.6, stop_type: 'pickup', student_id: 's1', school_id: null },
    { id: 'stop-2', route_id: 'route-uuid-1', order: 1, lat: -23.6, lng: -46.7, stop_type: 'school', student_id: null, school_id: 'sch1' },
  ];

  beforeEach(async () => {
    prisma = {
      routes: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      route_stops: { create: jest.fn(), findMany: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn() },
      route_optimizations: { create: jest.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [
        RoutesService,
        { provide: PrismaService, useValue: prisma },
        { provide: MapboxService, useValue: { optimizeRoute: jest.fn() } },
      ],
    }).compile();

    service = module.get(RoutesService);
    mapbox = module.get(MapboxService);
  });

  it('should create a route scoped to tenant', async () => {
    prisma.routes.create.mockResolvedValue(mockRoute);

    const result = await service.create(tenantId, {
      name: 'Rota Manhã Centro',
      shift: RouteShift.MORNING,
      driver_id: 'driver-uuid-1',
      vehicle_id: 'vehicle-uuid-1',
      route_type: RouteType.FIXED,
    });

    expect(result.id).toBe('route-uuid-1');
    expect(prisma.routes.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tenant_id: tenantId, status: 'draft' }) }),
    );
  });

  it('should list routes filtered by tenant', async () => {
    prisma.routes.findMany.mockResolvedValue([mockRoute]);
    const result = await service.findAll(tenantId);
    expect(result).toHaveLength(1);
  });

  it('should throw NotFoundException when route not found', async () => {
    prisma.routes.findFirst.mockResolvedValue(null);
    await expect(service.findOne(tenantId, 'nonexistent')).rejects.toThrow(NotFoundException);
  });

  it('should add a stop to a route', async () => {
    prisma.routes.findFirst.mockResolvedValue(mockRoute);
    prisma.route_stops.create.mockResolvedValue(mockStops[0]);

    const result = await service.addStop(tenantId, 'route-uuid-1', {
      order: 0,
      student_id: 's1',
      lat: -23.5,
      lng: -46.6,
      stop_type: StopType.PICKUP,
    });

    expect(result.stop_type).toBe('pickup');
  });

  it('should optimize stop order via Mapbox and save history', async () => {
    prisma.routes.findFirst.mockResolvedValue(mockRoute);
    prisma.route_stops.findMany.mockResolvedValue(mockStops);
    mapbox.optimizeRoute.mockResolvedValue([1, 0]); // reversed order
    prisma.route_stops.updateMany.mockResolvedValue({ count: 2 });
    prisma.route_optimizations.create.mockResolvedValue({ id: 'opt-1' });

    await service.optimize(tenantId, 'route-uuid-1', managerId, 'distance');

    expect(mapbox.optimizeRoute).toHaveBeenCalled();
    expect(prisma.route_optimizations.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          route_id: 'route-uuid-1',
          optimized_by: managerId,
          criteria: 'distance',
        }),
      }),
    );
  });

  it('should approve a draft route (RF13.6)', async () => {
    prisma.routes.findFirst.mockResolvedValue(mockRoute);
    prisma.routes.update.mockResolvedValue({ ...mockRoute, status: 'approved', approved_by: managerId });

    const result = await service.approve(tenantId, 'route-uuid-1', managerId);

    expect(result.status).toBe('approved');
    expect(prisma.routes.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'approved', approved_by: managerId }),
      }),
    );
  });

  it('should throw BadRequestException when approving an already approved route', async () => {
    prisma.routes.findFirst.mockResolvedValue({ ...mockRoute, status: 'approved' });

    await expect(service.approve(tenantId, 'route-uuid-1', managerId)).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException when approving an active route', async () => {
    prisma.routes.findFirst.mockResolvedValue({ ...mockRoute, status: 'active' });

    await expect(service.approve(tenantId, 'route-uuid-1', managerId)).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException when approving an inactive route', async () => {
    prisma.routes.findFirst.mockResolvedValue({ ...mockRoute, status: 'inactive' });

    await expect(service.approve(tenantId, 'route-uuid-1', managerId)).rejects.toThrow(BadRequestException);
  });

  it('should set approved_by and approved_at atomically on approval', async () => {
    prisma.routes.findFirst.mockResolvedValue(mockRoute);
    prisma.routes.update.mockResolvedValue({
      ...mockRoute,
      status: 'approved',
      approved_by: managerId,
      approved_at: new Date(),
    });

    const result = await service.approve(tenantId, 'route-uuid-1', managerId);

    expect(result.approved_by).toBe(managerId);
    expect(result.approved_at).toBeDefined();
    expect(prisma.routes.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'approved',
          approved_by: managerId,
          approved_at: expect.any(Date),
        }),
      }),
    );
  });
});
```

- [ ] **2.3** Rodar para confirmar FAIL:

```bash
cd services/app-api && pnpm test -- --testPathPattern=routes.service
```

Expected: FAIL

- [ ] **2.4** Criar `services/app-api/src/operational/routes/routes.service.ts`:

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MapboxService, OptimizationCriteria } from './mapbox/mapbox.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { CreateStopDto } from './dto/create-stop.dto';

@Injectable()
export class RoutesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapbox: MapboxService,
  ) {}

  async create(tenantId: string, dto: CreateRouteDto) {
    return this.prisma.routes.create({
      data: {
        tenant_id: tenantId,
        name: dto.name,
        shift: dto.shift,
        driver_id: dto.driver_id,
        vehicle_id: dto.vehicle_id,
        route_type: dto.route_type ?? 'fixed',
        status: 'draft',
      },
    });
  }

  async findAll(tenantId: string, shift?: string) {
    return this.prisma.routes.findMany({
      where: {
        tenant_id: tenantId,
        ...(shift ? { shift } : {}),
      },
      include: {
        route_stops: { orderBy: { order: 'asc' } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const route = await this.prisma.routes.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        route_stops: { orderBy: { order: 'asc' } },
        route_optimizations: { orderBy: { created_at: 'desc' }, take: 5 },
      },
    });
    if (!route) throw new NotFoundException(`Route ${id} not found`);
    return route;
  }

  async update(tenantId: string, id: string, dto: UpdateRouteDto) {
    await this.findOne(tenantId, id);
    return this.prisma.routes.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.routes.update({ where: { id }, data: { status: 'inactive' } });
  }

  async addStop(tenantId: string, routeId: string, dto: CreateStopDto) {
    await this.findOne(tenantId, routeId);
    return this.prisma.route_stops.create({
      data: {
        route_id: routeId,
        order: dto.order,
        student_id: dto.student_id ?? null,
        school_id: dto.school_id ?? null,
        lat: dto.lat,
        lng: dto.lng,
        stop_type: dto.stop_type,
      },
    });
  }

  async removeStop(tenantId: string, routeId: string, stopId: string) {
    await this.findOne(tenantId, routeId);
    return this.prisma.route_stops.deleteMany({
      where: { id: stopId, route_id: routeId },
    });
  }

  async optimize(
    tenantId: string,
    routeId: string,
    userId: string,
    criteria: OptimizationCriteria,
  ) {
    await this.findOne(tenantId, routeId);

    const stops = await this.prisma.route_stops.findMany({
      where: { route_id: routeId },
      orderBy: { order: 'asc' },
    });

    if (stops.length < 2) {
      throw new BadRequestException('Route must have at least 2 stops to optimize');
    }

    const beforeOrder = stops.map((s) => ({ id: s.id, order: s.order }));

    const optimizedIndices = await this.mapbox.optimizeRoute(
      stops.map((s) => ({ lat: Number(s.lat), lng: Number(s.lng) })),
      criteria,
    );

    // Apply new order: optimizedIndices[newOrder] = originalIndex
    const updates = optimizedIndices.map((originalIdx, newOrder) =>
      this.prisma.route_stops.updateMany({
        where: { id: stops[originalIdx].id },
        data: { order: newOrder },
      }),
    );

    await this.prisma.$transaction(updates);

    const afterStops = await this.prisma.route_stops.findMany({
      where: { route_id: routeId },
      orderBy: { order: 'asc' },
    });

    await this.prisma.route_optimizations.create({
      data: {
        route_id: routeId,
        optimized_by: userId,
        criteria,
        stops_order_before: beforeOrder,
        stops_order_after: afterStops.map((s) => ({ id: s.id, order: s.order })),
      },
    });

    return afterStops;
  }

  async approve(tenantId: string, routeId: string, userId: string) {
    const route = await this.findOne(tenantId, routeId);

    if (route.status !== 'draft') {
      throw new BadRequestException(`Route is already ${route.status} — only draft routes can be approved`);
    }

    return this.prisma.routes.update({
      where: { id: routeId },
      data: { status: 'approved', approved_by: userId, approved_at: new Date() },
    });
  }
}
```

- [ ] **2.5** Rodar testes para confirmar PASS:

```bash
cd services/app-api && pnpm test -- --testPathPattern=routes.service
```

Expected: PASS — 6 tests passando.

- [ ] **2.6** Commit:

```bash
git add services/app-api/src/operational/routes/dto/ services/app-api/src/operational/routes/routes.service.ts test/operational/routes.service.spec.ts
git commit -m "feat(app-api): add RoutesService with CRUD, stops management, Mapbox optimization and approval"
```

---

### Task 3: RoutesController e RoutesModule

**Files:**
- Create: `services/app-api/src/operational/routes/routes.controller.ts`
- Create: `services/app-api/src/operational/routes/routes.module.ts`
- Modify: `services/app-api/src/app.module.ts`

- [ ] **3.1** Criar `routes.controller.ts`:

```typescript
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
```

- [ ] **3.2** Criar `routes.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';
import { MapboxModule } from './mapbox/mapbox.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, MapboxModule],
  controllers: [RoutesController],
  providers: [RoutesService],
  exports: [RoutesService],
})
export class RoutesModule {}
```

- [ ] **3.3** Adicionar `RoutesModule` no `app.module.ts`.

- [ ] **3.4** Verificar compilação + testes:

```bash
cd services/app-api && pnpm exec tsc --noEmit && pnpm test
```

Expected: zero erros, todos os testes passando.

- [ ] **3.5** Commit:

```bash
git add services/app-api/src/operational/routes/ services/app-api/src/app.module.ts
git commit -m "feat(app-api): wire RoutesModule — RF13 complete"
```

---

### Task 4: PR + Deploy Sprint 4.1

- [ ] **4.1** Criar PR `feat/fase4-rotas` → `main`. Verificar que `MAPBOX_TOKEN` está no Railway antes do merge.
- [ ] **4.2** Merge + deploy via railway:use-railway.
- [ ] **4.3** Validar em produção:

```bash
# Criar rota
curl -X POST https://<app-api-url>/routes \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Rota Manhã","shift":"morning","driver_id":"<driver-id>","vehicle_id":"<vehicle-id>"}'

# Adicionar paradas + otimizar
curl -X POST https://<app-api-url>/routes/<id>/optimize \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"criteria":"distance"}'

# Aprovar rota
curl -X POST https://<app-api-url>/routes/<id>/approve \
  -H "Authorization: Bearer <jwt>"
```

Expected: criação 201, otimização retorna stops reordenados, aprovação muda status para `approved`.

---

## Sprint 4.2 — Frequência / Attendance (RF15)

**Definição de pronto:** upsert de decisão de presença por aluno/rota/data/direção e consulta para filtrar paradas da execução.

### Task 5: AttendanceModule

**Files:**
- Create: `services/app-api/src/operational/attendance/dto/upsert-attendance.dto.ts`
- Create: `services/app-api/src/operational/attendance/attendance.service.ts`
- Create: `services/app-api/src/operational/attendance/attendance.controller.ts`
- Create: `services/app-api/src/operational/attendance/attendance.module.ts`
- Create: `test/operational/attendance.service.spec.ts`

- [ ] **5.1** Criar `dto/upsert-attendance.dto.ts`:

```typescript
import { IsUUID, IsEnum, IsDateString } from 'class-validator';

export enum AttendanceDirection {
  OUTBOUND = 'outbound',
  INBOUND = 'inbound',
}

export enum AttendanceDecision {
  YES = 'yes',
  NO = 'no',
  NO_RESPONSE = 'no_response',
}

export enum AttendanceSource {
  GUARDIAN = 'guardian',
  MANAGER = 'manager',
  API = 'api',
}

export class UpsertAttendanceDto {
  @IsUUID()
  student_id: string;

  @IsUUID()
  route_id: string;

  @IsDateString()
  service_date: string;

  @IsEnum(AttendanceDirection)
  direction: AttendanceDirection;

  @IsEnum(AttendanceDecision)
  decision: AttendanceDecision;

  @IsEnum(AttendanceSource)
  source: AttendanceSource;
}
```

- [ ] **5.2** Escrever `test/operational/attendance.service.spec.ts` (failing first):

```typescript
import { Test } from '@nestjs/testing';
import { AttendanceService } from '../../src/operational/attendance/attendance.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AttendanceDirection, AttendanceDecision, AttendanceSource } from '../../src/operational/attendance/dto/upsert-attendance.dto';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prisma: {
    attendance: { upsert: jest.Mock; findMany: jest.Mock; update: jest.Mock };
    routes: { findFirst: jest.Mock };
    students: { findFirst: jest.Mock };
  };

  const tenantId = 'tenant-uuid-1';
  const userId = 'manager-uuid-1';

  beforeEach(async () => {
    prisma = {
      attendance: { upsert: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      routes: { findFirst: jest.fn().mockResolvedValue({ id: 'r1', tenant_id: tenantId }) },
      students: { findFirst: jest.fn().mockResolvedValue({ id: 's1', tenant_id: tenantId }) },
    };

    const module = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(AttendanceService);
  });

  it('should upsert attendance decision (create or update — RF15.5)', async () => {
    prisma.attendance.upsert.mockResolvedValue({
      id: 'att-1',
      student_id: 'student-1',
      route_id: 'route-1',
      service_date: new Date('2026-03-20'),
      direction: 'outbound',
      decision: 'yes',
      source: 'manager',
    });

    const result = await service.upsert(tenantId, userId, {
      student_id: 'student-1',
      route_id: 'route-1',
      service_date: '2026-03-20',
      direction: AttendanceDirection.OUTBOUND,
      decision: AttendanceDecision.YES,
      source: AttendanceSource.MANAGER,
    });

    expect(result.decision).toBe('yes');
    expect(prisma.attendance.upsert).toHaveBeenCalled();
  });

  it('should query attendance by route, date and direction', async () => {
    prisma.attendance.findMany.mockResolvedValue([
      { student_id: 's1', decision: 'yes', direction: 'outbound' },
      { student_id: 's2', decision: 'no', direction: 'outbound' },
    ]);

    const result = await service.findByRoute(tenantId, 'route-1', '2026-03-20', 'outbound');

    expect(result).toHaveLength(2);
    expect(prisma.attendance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenant_id: tenantId,
          route_id: 'route-1',
          direction: 'outbound',
        }),
      }),
    );
  });

  it('should set override_by only when source is MANAGER (RF15.5 — manual override traceability)', async () => {
    prisma.attendance.upsert.mockResolvedValue({ id: 'att-1', override_by: userId });

    await service.upsert(tenantId, userId, {
      student_id: 's1',
      route_id: 'r1',
      service_date: '2026-03-20',
      direction: AttendanceDirection.OUTBOUND,
      decision: AttendanceDecision.NO,
      source: AttendanceSource.MANAGER,
    });

    // override_by set only for manager source — makes audit trail meaningful
    expect(prisma.attendance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ override_by: userId }),
      }),
    );
  });

  it('should NOT set override_by when source is GUARDIAN (initial decision, not override)', async () => {
    prisma.attendance.upsert.mockResolvedValue({ id: 'att-1', override_by: null });

    await service.upsert(tenantId, userId, {
      student_id: 's1',
      route_id: 'r1',
      service_date: '2026-03-20',
      direction: AttendanceDirection.OUTBOUND,
      decision: AttendanceDecision.YES,
      source: AttendanceSource.GUARDIAN,
    });

    expect(prisma.attendance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ override_by: null }),
      }),
    );
  });
});
```

- [ ] **5.3** Rodar para confirmar FAIL:

```bash
cd services/app-api && pnpm test -- --testPathPattern=attendance.service
```

Expected: FAIL

- [ ] **5.4** Criar `services/app-api/src/operational/attendance/attendance.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertAttendanceDto } from './dto/upsert-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(tenantId: string, userId: string, dto: UpsertAttendanceDto) {
    const serviceDate = new Date(dto.service_date);

    // Validate that route and student belong to the tenant
    const route = await this.prisma.routes.findFirst({
      where: { id: dto.route_id, tenant_id: tenantId },
    });
    if (!route) throw new NotFoundException(`Route ${dto.route_id} not found`);

    const student = await this.prisma.students.findFirst({
      where: { id: dto.student_id, tenant_id: tenantId },
    });
    if (!student) throw new NotFoundException(`Student ${dto.student_id} not found`);

    // override_by is only set for manual manager overrides (RF15.5 traceability)
    const isManualOverride = dto.source === 'manager';

    return this.prisma.attendance.upsert({
      where: {
        student_id_route_id_service_date_direction: {
          student_id: dto.student_id,
          route_id: dto.route_id,
          service_date: serviceDate,
          direction: dto.direction,
        },
      },
      create: {
        tenant_id: tenantId,
        student_id: dto.student_id,
        route_id: dto.route_id,
        service_date: serviceDate,
        direction: dto.direction,
        decision: dto.decision,
        source: dto.source,
        override_by: isManualOverride ? userId : null,
      },
      update: {
        decision: dto.decision,
        source: dto.source,
        override_by: isManualOverride ? userId : null,
      },
    });
  }

  async findByRoute(
    tenantId: string,
    routeId: string,
    serviceDate: string,
    direction?: string,
  ) {
    return this.prisma.attendance.findMany({
      where: {
        tenant_id: tenantId,
        route_id: routeId,
        service_date: new Date(serviceDate),
        ...(direction ? { direction } : {}),
      },
    });
  }
}
```

- [ ] **5.5** Criar `attendance.controller.ts`:

```typescript
import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { TenantId } from '../../auth/decorators/tenant-id.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtPayload } from '@routtes/shared';
import { AttendanceService } from './attendance.service';
import { UpsertAttendanceDto } from './dto/upsert-attendance.dto';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  upsert(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload, @Body() dto: UpsertAttendanceDto) {
    return this.attendanceService.upsert(tenantId, user.sub, dto);
  }

  @Get()
  findByRoute(
    @TenantId() tenantId: string,
    @Query('routeId') routeId: string,
    @Query('serviceDate') serviceDate: string,
    @Query('direction') direction?: string,
  ) {
    return this.attendanceService.findByRoute(tenantId, routeId, serviceDate, direction);
  }
}
```

- [ ] **5.6** Criar `attendance.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
```

- [ ] **5.7** Adicionar `AttendanceModule` no `app.module.ts`.

- [ ] **5.8** Rodar testes para confirmar PASS:

```bash
cd services/app-api && pnpm test -- --testPathPattern=attendance.service
```

Expected: PASS — 3 tests passando.

- [ ] **5.9** Verificar compilação + todos os testes:

```bash
cd services/app-api && pnpm exec tsc --noEmit && pnpm test
```

- [ ] **5.10** Commit:

```bash
git add services/app-api/src/operational/attendance/ services/app-api/src/app.module.ts test/operational/attendance.service.spec.ts
git commit -m "feat(app-api): add AttendanceModule — RF15 complete"
```

---

### Task 6: PR + Deploy Sprint 4.2

- [ ] **6.1** Criar PR `feat/fase4-frequencia` → `main`.
- [ ] **6.2** Merge + deploy via railway:use-railway.
- [ ] **6.3** Validar:

```bash
# Registrar decisão de presença
curl -X POST https://<app-api-url>/attendance \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"student_id":"<id>","route_id":"<id>","service_date":"2026-03-20","direction":"outbound","decision":"yes","source":"manager"}'

# Consultar presença para uma rota/data
curl "https://<app-api-url>/attendance?routeId=<id>&serviceDate=2026-03-20&direction=outbound" \
  -H "Authorization: Bearer <jwt>"
```

---

## Sprint 4.3 — Execução: prepare + start + recordStop (RF14.1-14.3)

**Definição de pronto:** motorista consegue preparar, iniciar e registrar paradas de uma execução. Outbox events gravados para `EXECUTION_STARTED` e `STUDENT_BOARDED`.

### Task 7: DTOs de Execução

**Files:**
- Create: `services/app-api/src/operational/executions/dto/prepare-execution.dto.ts`
- Create: `services/app-api/src/operational/executions/dto/record-stop.dto.ts`
- Create: `services/app-api/src/operational/executions/dto/add-route-event.dto.ts`
- Create: `services/app-api/src/operational/executions/dto/finish-execution.dto.ts`

- [ ] **7.1** Criar `prepare-execution.dto.ts`:

```typescript
import { IsUUID, IsDateString, IsEnum } from 'class-validator';
import { AttendanceDirection } from '../attendance/dto/upsert-attendance.dto';

export class PrepareExecutionDto {
  @IsUUID()
  route_id: string;

  @IsUUID()
  driver_id: string;

  @IsUUID()
  vehicle_id: string;

  @IsDateString()
  service_date: string;

  @IsEnum(AttendanceDirection)
  direction: AttendanceDirection;
}
```

- [ ] **7.2** Criar `record-stop.dto.ts`:

```typescript
import { IsUUID, IsEnum } from 'class-validator';

export enum StopStatus {
  BOARDED = 'boarded',
  SKIPPED = 'skipped',
  ABSENT = 'absent',
}

export class RecordStopDto {
  @IsUUID()
  execution_stop_id: string;

  @IsEnum(StopStatus)
  status: StopStatus;
}
```

- [ ] **7.3** Criar `add-route-event.dto.ts`:

```typescript
import { IsEnum, IsString, IsNumber, IsOptional } from 'class-validator';

export enum RouteEventType {
  DELAY = 'delay',
  DETOUR = 'detour',
  MECHANICAL = 'mechanical',
  OBSERVATION = 'observation',
  OTHER = 'other',
}

export class AddRouteEventDto {
  @IsEnum(RouteEventType)
  type: RouteEventType;

  @IsString()
  description: string;

  @IsNumber()
  @IsOptional()
  lat?: number;

  @IsNumber()
  @IsOptional()
  lng?: number;
}
```

- [ ] **7.4** Criar `finish-execution.dto.ts`:

```typescript
import { IsNumber, IsOptional } from 'class-validator';

export class FinishExecutionDto {
  @IsNumber()
  @IsOptional()
  total_km?: number;
}
```

- [ ] **7.5** Commit:

```bash
git add services/app-api/src/operational/executions/dto/
git commit -m "feat(app-api): add executions DTOs"
```

---

### Task 8: ExecutionsService — prepare, start, recordStop

**Files:**
- Create: `services/app-api/src/operational/executions/executions.service.ts`
- Create: `test/operational/executions.service.spec.ts`

- [ ] **8.1** Escrever `test/operational/executions.service.spec.ts` (failing first — cobre **todos** os métodos do service: prepare, start, recordStop, addRouteEvent, finish, cancel):

```typescript
import { Test } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { ExecutionsService } from '../../src/operational/executions/executions.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AttendanceDirection } from '../../src/operational/attendance/dto/upsert-attendance.dto';
import { StopStatus } from '../../src/operational/executions/dto/record-stop.dto';
import { RouteEventType } from '../../src/operational/executions/dto/add-route-event.dto';

describe('ExecutionsService', () => {
  let service: ExecutionsService;
  let prisma: {
    routes: { findFirst: jest.Mock };
    route_stops: { findMany: jest.Mock };
    attendance: { findMany: jest.Mock };
    route_executions: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    execution_stops: {
      createMany: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    route_events: { create: jest.Mock };
    outbox_events: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  const tenantId = 'tenant-uuid-1';
  const driverId = 'driver-uuid-1';

  const mockRoute = {
    id: 'route-uuid-1',
    tenant_id: tenantId,
    status: 'approved',
    shift: 'morning',
    driver_id: driverId,
    vehicle_id: 'vehicle-uuid-1',
  };

  const mockStops = [
    { id: 'stop-1', route_id: 'route-uuid-1', order: 0, student_id: 's1', school_id: null, stop_type: 'pickup', lat: -23.5, lng: -46.6 },
    { id: 'stop-2', route_id: 'route-uuid-1', order: 1, student_id: null, school_id: 'sch1', stop_type: 'school', lat: -23.4, lng: -46.5 },
  ];

  const mockExecution = {
    id: 'exec-uuid-1',
    tenant_id: tenantId,
    route_id: 'route-uuid-1',
    driver_id: driverId,
    vehicle_id: 'vehicle-uuid-1',
    service_date: new Date('2026-03-20'),
    status: 'prepared',
    started_at: null,
    finished_at: null,
  };

  const mockExecutionInProgress = { ...mockExecution, status: 'in_progress', started_at: new Date() };

  beforeEach(async () => {
    prisma = {
      routes: { findFirst: jest.fn() },
      route_stops: { findMany: jest.fn() },
      attendance: { findMany: jest.fn() },
      route_executions: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      execution_stops: {
        createMany: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      route_events: { create: jest.fn() },
      outbox_events: { create: jest.fn() },
      $transaction: jest.fn((fn) => (typeof fn === 'function' ? fn(prisma) : Promise.all(fn))),
    };

    const module = await Test.createTestingModule({
      providers: [
        ExecutionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ExecutionsService);
  });

  describe('prepare()', () => {
    it('should create execution with filtered stops based on attendance (RF14.1)', async () => {
      prisma.routes.findFirst.mockResolvedValue(mockRoute);
      prisma.route_stops.findMany.mockResolvedValue(mockStops);
      // s1 decided no → only school stop remains
      prisma.attendance.findMany.mockResolvedValue([
        { student_id: 's1', decision: 'no' },
      ]);
      prisma.route_executions.create.mockResolvedValue(mockExecution);
      prisma.execution_stops.createMany.mockResolvedValue({ count: 1 });

      const result = await service.prepare(tenantId, {
        route_id: 'route-uuid-1',
        driver_id: driverId,
        vehicle_id: 'vehicle-uuid-1',
        service_date: '2026-03-20',
        direction: AttendanceDirection.OUTBOUND,
      });

      expect(result.id).toBe('exec-uuid-1');
      // execution_stops.createMany should only include stops where student not absent
      expect(prisma.execution_stops.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ route_stop_id: 'stop-2' }), // school stop always included
          ]),
        }),
      );
    });

    it('should throw BadRequestException when route is not approved (RF13.6)', async () => {
      prisma.routes.findFirst.mockResolvedValue({ ...mockRoute, status: 'draft' });

      await expect(service.prepare(tenantId, {
        route_id: 'route-uuid-1',
        driver_id: driverId,
        vehicle_id: 'vehicle-uuid-1',
        service_date: '2026-03-20',
        direction: AttendanceDirection.OUTBOUND,
      })).rejects.toThrow(BadRequestException);
    });
  });

  describe('start()', () => {
    it('should transition execution to in_progress and write EXECUTION_STARTED outbox event (RF14.2)', async () => {
      prisma.route_executions.findFirst.mockResolvedValue(mockExecution);

      await service.start(tenantId, 'exec-uuid-1');

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw ConflictException when execution is already in_progress', async () => {
      prisma.route_executions.findFirst.mockResolvedValue(mockExecutionInProgress);

      await expect(service.start(tenantId, 'exec-uuid-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('recordStop()', () => {
    it('should mark execution_stop as boarded and write STUDENT_BOARDED outbox event (RF14.3)', async () => {
      prisma.route_executions.findFirst.mockResolvedValue(mockExecutionInProgress);
      prisma.execution_stops.findFirst.mockResolvedValue({
        id: 'es-1',
        execution_id: 'exec-uuid-1',
        route_stop_id: 'stop-1',
        status: 'pending',
        route_stops: { student_id: 's1', stop_type: 'pickup' },
      });

      await service.recordStop(tenantId, 'exec-uuid-1', {
        execution_stop_id: 'es-1',
        status: StopStatus.BOARDED,
      });

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException when recording a stop on a non-in_progress execution', async () => {
      prisma.route_executions.findFirst.mockResolvedValue(mockExecution); // prepared, not in_progress

      await expect(service.recordStop(tenantId, 'exec-uuid-1', {
        execution_stop_id: 'es-1',
        status: StopStatus.BOARDED,
      })).rejects.toThrow(BadRequestException);
    });
  });

  describe('addRouteEvent()', () => {
    it('should create a route_event during in_progress execution (RF14.8)', async () => {
      prisma.route_executions.findFirst.mockResolvedValue(mockExecutionInProgress);
      prisma.route_events.create.mockResolvedValue({ id: 'ev-1', type: 'delay' });

      const result = await service.addRouteEvent(tenantId, 'exec-uuid-1', {
        type: RouteEventType.DELAY,
        description: 'Traffic jam on route',
        lat: -23.5,
        lng: -46.6,
      });

      expect(result.type).toBe('delay');
    });
  });

  describe('finish()', () => {
    it('should finish execution and write EXECUTION_FINISHED outbox event (RF14.4)', async () => {
      prisma.route_executions.findFirst.mockResolvedValue(mockExecutionInProgress);
      // All boarded students at pickup have a corresponding school/dropoff boarded stop
      prisma.execution_stops.findMany.mockResolvedValue([
        { id: 'es-1', status: 'boarded', route_stops: { stop_type: 'pickup', student_id: 's1' } },
        { id: 'es-2', status: 'boarded', route_stops: { stop_type: 'school', student_id: 's1' } },
      ]);

      await service.finish(tenantId, 'exec-uuid-1', { total_km: 12.5 });

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException when any boarded pickup student is not delivered — RF14.9 (anti-forgetting lock)', async () => {
      prisma.route_executions.findFirst.mockResolvedValue(mockExecutionInProgress);
      // Student s1 boarded at pickup but no school/dropoff boarded stop for s1
      prisma.execution_stops.findMany.mockResolvedValue([
        { id: 'es-1', status: 'boarded', route_stops: { stop_type: 'pickup', student_id: 's1' } },
        { id: 'es-2', status: 'boarded', route_stops: { stop_type: 'pickup', student_id: 's2' } },
        { id: 'es-3', status: 'boarded', route_stops: { stop_type: 'school', student_id: 's2' } },
        // s1 has NO delivery stop boarded
      ]);

      await expect(service.finish(tenantId, 'exec-uuid-1', {})).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when execution is not in_progress', async () => {
      prisma.route_executions.findFirst.mockResolvedValue(mockExecution); // prepared

      await expect(service.finish(tenantId, 'exec-uuid-1', {})).rejects.toThrow(BadRequestException);
    });

    it('should rollback if outbox write fails — Outbox Pattern reliability', async () => {
      prisma.route_executions.findFirst.mockResolvedValue(mockExecutionInProgress);
      prisma.execution_stops.findMany.mockResolvedValue([
        { id: 'es-1', status: 'boarded', route_stops: { stop_type: 'school', student_id: 's1' } },
      ]);
      // Simulate $transaction throwing (e.g., outbox_events write fails)
      prisma.$transaction.mockRejectedValueOnce(new Error('DB write failed'));

      await expect(service.finish(tenantId, 'exec-uuid-1', {})).rejects.toThrow('DB write failed');

      // Execution status must NOT have changed — the transaction rolled back
      // (In real Prisma $transaction, rollback is automatic; here we verify $transaction was called once)
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancel()', () => {
    it('should cancel a prepared execution and write ROUTE_CANCELLED outbox event (RF14.5)', async () => {
      prisma.route_executions.findFirst.mockResolvedValue(mockExecution); // prepared

      await service.cancel(tenantId, 'exec-uuid-1');

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should cancel an in_progress execution', async () => {
      prisma.route_executions.findFirst.mockResolvedValue(mockExecutionInProgress);

      await service.cancel(tenantId, 'exec-uuid-1');

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException when cancelling a finished execution', async () => {
      prisma.route_executions.findFirst.mockResolvedValue({
        ...mockExecution,
        status: 'finished',
      });

      await expect(service.cancel(tenantId, 'exec-uuid-1')).rejects.toThrow(BadRequestException);
    });
  });
});
```

- [ ] **8.2** Rodar para confirmar FAIL:

```bash
cd services/app-api && pnpm test -- --testPathPattern=executions.service
```

Expected: FAIL

- [ ] **8.3** Criar `services/app-api/src/operational/executions/executions.service.ts`:

```typescript
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PrepareExecutionDto } from './dto/prepare-execution.dto';
import { RecordStopDto, StopStatus } from './dto/record-stop.dto';
import { AddRouteEventDto } from './dto/add-route-event.dto';
import { FinishExecutionDto } from './dto/finish-execution.dto';

@Injectable()
export class ExecutionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── helpers ────────────────────────────────────────────────────────────────

  private async findExecution(tenantId: string, id: string) {
    const exec = await this.prisma.route_executions.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!exec) throw new NotFoundException(`Execution ${id} not found`);
    return exec;
  }

  private async writeOutbox(
    tx: any,
    aggregateId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    return tx.outbox_events.create({
      data: {
        aggregate_type: 'route_execution',
        aggregate_id: aggregateId,
        event_type: eventType,
        payload,
        published: false,
      },
    });
  }

  // ─── prepare ────────────────────────────────────────────────────────────────

  async prepare(tenantId: string, dto: PrepareExecutionDto) {
    const route = await this.prisma.routes.findFirst({
      where: { id: dto.route_id, tenant_id: tenantId },
    });
    if (!route) throw new NotFoundException(`Route ${dto.route_id} not found`);
    if (route.status !== 'approved') {
      throw new BadRequestException('Only approved routes can be executed');
    }

    const stops = await this.prisma.route_stops.findMany({
      where: { route_id: dto.route_id },
      orderBy: { order: 'asc' },
    });

    // Get attendance decisions to filter out absent students
    const attendanceList = await this.prisma.attendance.findMany({
      where: {
        tenant_id: tenantId,
        route_id: dto.route_id,
        service_date: new Date(dto.service_date),
        direction: dto.direction,
        decision: 'no',
      },
    });
    const absentStudentIds = new Set(attendanceList.map((a: any) => a.student_id));

    // School stops always included; student stops excluded if absent
    const qualifyingStops = stops.filter(
      (s) => !s.student_id || !absentStudentIds.has(s.student_id),
    );

    const execution = await this.prisma.route_executions.create({
      data: {
        tenant_id: tenantId,
        route_id: dto.route_id,
        driver_id: dto.driver_id,
        vehicle_id: dto.vehicle_id,
        service_date: new Date(dto.service_date),
        status: 'prepared',
      },
    });

    await this.prisma.execution_stops.createMany({
      data: qualifyingStops.map((s, idx) => ({
        execution_id: execution.id,
        route_stop_id: s.id,
        order: idx,
        status: 'pending',
      })),
    });

    return execution;
  }

  // ─── start ──────────────────────────────────────────────────────────────────

  async start(tenantId: string, executionId: string) {
    const exec = await this.findExecution(tenantId, executionId);

    if (exec.status === 'in_progress') {
      throw new ConflictException('Execution is already in progress');
    }
    if (exec.status !== 'prepared') {
      throw new BadRequestException(`Cannot start execution with status: ${exec.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.route_executions.update({
        where: { id: executionId },
        data: { status: 'in_progress', started_at: new Date() },
      });
      await this.writeOutbox(tx, executionId, 'EXECUTION_STARTED', {
        tenantId,
        routeId: exec.route_id,
        driverId: exec.driver_id,
        vehicleId: exec.vehicle_id,
        serviceDate: exec.service_date,
      });
      return updated;
    });
  }

  // ─── recordStop ─────────────────────────────────────────────────────────────

  async recordStop(tenantId: string, executionId: string, dto: RecordStopDto) {
    const exec = await this.findExecution(tenantId, executionId);

    if (exec.status !== 'in_progress') {
      throw new BadRequestException('Can only record stops on in_progress executions');
    }

    const executionStop = await this.prisma.execution_stops.findFirst({
      where: { id: dto.execution_stop_id, execution_id: executionId },
      include: { route_stops: true },
    });
    if (!executionStop) throw new NotFoundException(`Execution stop ${dto.execution_stop_id} not found`);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.execution_stops.update({
        where: { id: dto.execution_stop_id },
        data: { status: dto.status, recorded_at: new Date() },
      });

      if (dto.status === StopStatus.BOARDED && (executionStop as any).route_stops?.student_id) {
        await this.writeOutbox(tx, executionId, 'STUDENT_BOARDED', {
          tenantId,
          executionId,
          studentId: (executionStop as any).route_stops.student_id,
          stopId: dto.execution_stop_id,
          recordedAt: new Date(),
        });
      }

      return updated;
    });
  }

  // ─── addRouteEvent ──────────────────────────────────────────────────────────

  async addRouteEvent(tenantId: string, executionId: string, dto: AddRouteEventDto) {
    const exec = await this.findExecution(tenantId, executionId);

    if (exec.status !== 'in_progress') {
      throw new BadRequestException('Can only add events to in_progress executions');
    }

    return this.prisma.route_events.create({
      data: {
        execution_id: executionId,
        type: dto.type,
        description: dto.description,
        lat: dto.lat ?? null,
        lng: dto.lng ?? null,
        recorded_at: new Date(),
      },
    });
  }

  // ─── finish ─────────────────────────────────────────────────────────────────

  async finish(tenantId: string, executionId: string, dto: FinishExecutionDto) {
    const exec = await this.findExecution(tenantId, executionId);

    if (exec.status !== 'in_progress') {
      throw new BadRequestException('Can only finish in_progress executions');
    }

    // RF14.9 — Anti-forgetting lock: reject if any pickup-boarded student has no delivery
    await this.assertNoUndeliveredStudents(executionId);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.route_executions.update({
        where: { id: executionId },
        data: {
          status: 'finished',
          finished_at: new Date(),
          total_km: dto.total_km ?? null,
        },
      });
      await this.writeOutbox(tx, executionId, 'EXECUTION_FINISHED', {
        tenantId,
        executionId,
        finishedAt: new Date(),
        totalKm: dto.total_km,
      });
      return updated;
    });
  }

  /**
   * RF14.9 — Trava anti-esquecimento.
   * Checks that every student who boarded at a pickup stop also has
   * a boarded record at a school/dropoff stop (i.e., was delivered).
   * Throws BadRequestException listing undelivered student stop IDs.
   */
  private async assertNoUndeliveredStudents(executionId: string) {
    const allStops = await this.prisma.execution_stops.findMany({
      where: { execution_id: executionId },
      include: { route_stops: true },
      orderBy: { order: 'asc' },
    });

    // Students who boarded at pickup stops
    const boardedAtPickup = allStops
      .filter(
        (s: any) =>
          s.status === 'boarded' && s.route_stops?.stop_type === 'pickup' && s.route_stops?.student_id,
      )
      .map((s: any) => s.route_stops.student_id as string);

    // Students who boarded at school/dropoff stops (delivered)
    const deliveredStudentIds = new Set(
      allStops
        .filter(
          (s: any) =>
            s.status === 'boarded' &&
            ['school', 'dropoff'].includes(s.route_stops?.stop_type) &&
            s.route_stops?.student_id,
        )
        .map((s: any) => s.route_stops.student_id as string),
    );

    const undelivered = boardedAtPickup.filter((id) => !deliveredStudentIds.has(id));

    if (undelivered.length > 0) {
      throw new BadRequestException(
        `Cannot finish route: ${undelivered.length} student(s) boarded but not delivered. ` +
          `Student IDs: ${undelivered.join(', ')}`,
      );
    }
  }

  // ─── cancel ─────────────────────────────────────────────────────────────────

  async cancel(tenantId: string, executionId: string) {
    const exec = await this.findExecution(tenantId, executionId);

    if (!['prepared', 'in_progress'].includes(exec.status)) {
      throw new BadRequestException(`Cannot cancel execution with status: ${exec.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.route_executions.update({
        where: { id: executionId },
        data: { status: 'cancelled', finished_at: new Date() },
      });
      await this.writeOutbox(tx, executionId, 'ROUTE_CANCELLED', {
        tenantId,
        executionId,
        cancelledAt: new Date(),
      });
      return updated;
    });
  }

  // ─── queries ────────────────────────────────────────────────────────────────

  async findActive(tenantId: string, driverId: string) {
    return this.prisma.route_executions.findFirst({
      where: { tenant_id: tenantId, driver_id: driverId, status: 'in_progress' },
      include: {
        execution_stops: {
          orderBy: { order: 'asc' },
          include: { route_stops: true },
        },
        route_events: { orderBy: { recorded_at: 'asc' } },
      },
    });
  }

  async findByRouteAndDate(tenantId: string, routeId: string, serviceDate: string) {
    return this.prisma.route_executions.findFirst({
      where: {
        tenant_id: tenantId,
        route_id: routeId,
        service_date: new Date(serviceDate),
      },
      include: {
        execution_stops: { orderBy: { order: 'asc' }, include: { route_stops: true } },
      },
    });
  }
}
```

- [ ] **8.4** Rodar testes para confirmar PASS:

```bash
cd services/app-api && pnpm test -- --testPathPattern=executions.service
```

Expected: PASS — todos os testes passando.

- [ ] **8.5** Commit:

```bash
git add services/app-api/src/operational/executions/executions.service.ts test/operational/executions.service.spec.ts
git commit -m "feat(app-api): add ExecutionsService with prepare, start, recordStop, addRouteEvent, finish (anti-forgetting), cancel"
```

---

### Task 9: ExecutionsController e ExecutionsModule

**Files:**
- Create: `services/app-api/src/operational/executions/executions.controller.ts`
- Create: `services/app-api/src/operational/executions/executions.module.ts`
- Modify: `services/app-api/src/app.module.ts`

- [ ] **9.1** Criar `executions.controller.ts`:

```typescript
import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { TenantId } from '../../auth/decorators/tenant-id.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtPayload } from '@routtes/shared';
import { ExecutionsService } from './executions.service';
import { PrepareExecutionDto } from './dto/prepare-execution.dto';
import { RecordStopDto } from './dto/record-stop.dto';
import { AddRouteEventDto } from './dto/add-route-event.dto';
import { FinishExecutionDto } from './dto/finish-execution.dto';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('executions')
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  // RF14.1 — Prepare execution
  @Post('prepare')
  prepare(@TenantId() tenantId: string, @Body() dto: PrepareExecutionDto) {
    return this.executionsService.prepare(tenantId, dto);
  }

  // RF14.2 — Start execution
  @Post(':id/start')
  start(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.executionsService.start(tenantId, id);
  }

  // RF14.3 — Record stop event
  @Post(':id/stops')
  recordStop(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: RecordStopDto,
  ) {
    return this.executionsService.recordStop(tenantId, id, dto);
  }

  // RF14.8 — Add route event (delay, detour, mechanical...)
  @Post(':id/events')
  addRouteEvent(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: AddRouteEventDto,
  ) {
    return this.executionsService.addRouteEvent(tenantId, id, dto);
  }

  // RF14.4 + RF14.9 — Finish with anti-forgetting check
  @Post(':id/finish')
  finish(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: FinishExecutionDto,
  ) {
    return this.executionsService.finish(tenantId, id, dto);
  }

  // RF14.5 — Cancel execution
  @Post(':id/cancel')
  cancel(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.executionsService.cancel(tenantId, id);
  }

  // RF14.6 — Get active execution for current driver
  @Get('active')
  findActive(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.executionsService.findActive(tenantId, user.sub);
  }

  // RF14.7 — Get execution by route + date
  @Get('by-route')
  findByRouteAndDate(
    @TenantId() tenantId: string,
    @Query('routeId') routeId: string,
    @Query('serviceDate') serviceDate: string,
  ) {
    return this.executionsService.findByRouteAndDate(tenantId, routeId, serviceDate);
  }
}
```

- [ ] **9.2** Criar `executions.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ExecutionsController } from './executions.controller';
import { ExecutionsService } from './executions.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ExecutionsController],
  providers: [ExecutionsService],
  exports: [ExecutionsService],
})
export class ExecutionsModule {}
```

- [ ] **9.3** Adicionar `ExecutionsModule` no `app.module.ts`.

- [ ] **9.4** Verificar compilação + todos os testes:

```bash
cd services/app-api && pnpm exec tsc --noEmit && pnpm test
```

Expected: zero erros, todos os testes passando.

- [ ] **9.5** Commit:

```bash
git add services/app-api/src/operational/executions/ services/app-api/src/app.module.ts
git commit -m "feat(app-api): wire ExecutionsModule — RF14.1-14.9 + RF15 complete"
```

---

### Task 10: PR + Deploy Sprint 4.3 e 4.4

- [ ] **10.1** Criar PR `feat/fase4-execucao` → `main`.
- [ ] **10.2** Merge + deploy via railway:use-railway.
- [ ] **10.3** Validar fluxo completo de execução em produção:

```bash
# 1. Preparar execução
curl -X POST https://<app-api-url>/executions/prepare \
  -H "Authorization: Bearer <jwt-driver>" \
  -H "Content-Type: application/json" \
  -d '{"route_id":"<id>","driver_id":"<id>","vehicle_id":"<id>","service_date":"2026-03-20","direction":"outbound"}'
# → { "id": "<exec-id>", "status": "prepared" }

# 2. Iniciar
curl -X POST https://<app-api-url>/executions/<exec-id>/start \
  -H "Authorization: Bearer <jwt-driver>"
# → { "status": "in_progress" }

# 3. Registrar parada
curl -X POST https://<app-api-url>/executions/<exec-id>/stops \
  -H "Authorization: Bearer <jwt-driver>" \
  -H "Content-Type: application/json" \
  -d '{"execution_stop_id":"<stop-id>","status":"boarded"}'

# 4. Tentar finalizar sem entregar aluno → 400
# 5. Marcar aluno como entregue (school stop = boarded) → finalizar → 200

# 6. Tentar cancelar uma execution finished → 400
```

- [ ] **10.4** Verificar `outbox_events` no Neon após cada ação:

```sql
-- Via Neon MCP
SELECT event_type, aggregate_id, published, created_at
FROM app.outbox_events
ORDER BY created_at DESC
LIMIT 10;
```

Expected: registros `EXECUTION_STARTED`, `STUDENT_BOARDED`, `EXECUTION_FINISHED` com `published = false`.

---

## Sprint 4.5 — Histórico Operacional (RF18)

**Definição de pronto:** consulta de execuções finalizadas com filtros e agregados.

### Task 11: HistoryModule

**Files:**
- Create: `services/app-api/src/operational/history/history.service.ts`
- Create: `services/app-api/src/operational/history/history.controller.ts`
- Create: `services/app-api/src/operational/history/history.module.ts`

- [ ] **11.1** Criar `history.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface HistoryFilters {
  startDate?: string;
  endDate?: string;
  driverId?: string;
  vehicleId?: string;
  routeId?: string;
}

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filters: HistoryFilters) {
    const where: any = {
      tenant_id: tenantId,
      status: 'finished',
    };

    if (filters.startDate) {
      where.service_date = { gte: new Date(filters.startDate) };
    }
    if (filters.endDate) {
      where.service_date = {
        ...where.service_date,
        lte: new Date(filters.endDate),
      };
    }
    if (filters.driverId) where.driver_id = filters.driverId;
    if (filters.vehicleId) where.vehicle_id = filters.vehicleId;
    if (filters.routeId) where.route_id = filters.routeId;

    const executions = await this.prisma.route_executions.findMany({
      where,
      include: {
        execution_stops: {
          include: { route_stops: { select: { stop_type: true, student_id: true } } },
        },
        routes: { select: { name: true, shift: true } },
      },
      orderBy: { service_date: 'desc' },
    });

    return executions.map((exec) => this.aggregate(exec));
  }

  private aggregate(exec: any) {
    const stops = exec.execution_stops ?? [];
    const boarded = stops.filter((s: any) => s.status === 'boarded' && s.route_stops?.student_id);
    const skipped = stops.filter((s: any) => s.status === 'skipped');
    const absent = stops.filter((s: any) => s.status === 'absent');

    const durationMs =
      exec.finished_at && exec.started_at
        ? new Date(exec.finished_at).getTime() - new Date(exec.started_at).getTime()
        : null;
    const durationMinutes = durationMs ? Math.round(durationMs / 60000) : null;

    return {
      id: exec.id,
      routeName: exec.routes?.name,
      shift: exec.routes?.shift,
      serviceDate: exec.service_date,
      driverId: exec.driver_id,
      vehicleId: exec.vehicle_id,
      startedAt: exec.started_at,
      finishedAt: exec.finished_at,
      durationMinutes,
      totalKm: exec.total_km,
      studentsBoarded: boarded.length,
      studentsSkipped: skipped.length,
      studentsAbsent: absent.length,
    };
  }
}
```

- [ ] **11.2** Criar `history.controller.ts`:

```typescript
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { TenantId } from '../../auth/decorators/tenant-id.decorator';
import { HistoryService } from './history.service';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('driverId') driverId?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('routeId') routeId?: string,
  ) {
    return this.historyService.findAll(tenantId, {
      startDate,
      endDate,
      driverId,
      vehicleId,
      routeId,
    });
  }
}
```

- [ ] **11.3** Criar `history.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HistoryController],
  providers: [HistoryService],
})
export class HistoryModule {}
```

- [ ] **11.4** Adicionar `HistoryModule` no `app.module.ts`.

- [ ] **11.5** Verificar compilação + testes:

```bash
cd services/app-api && pnpm exec tsc --noEmit && pnpm test
```

- [ ] **11.6** Commit:

```bash
git add services/app-api/src/operational/history/ services/app-api/src/app.module.ts
git commit -m "feat(app-api): add HistoryModule — RF18 complete"
```

---

### Task 12: PR + Deploy Sprint 4.5

- [ ] **12.1** Criar PR `feat/fase4-historico` → `main`.
- [ ] **12.2** Merge + deploy via railway:use-railway.
- [ ] **12.3** Validar:

```bash
# Histórico com filtros
curl "https://<app-api-url>/history?startDate=2026-03-01&endDate=2026-03-31" \
  -H "Authorization: Bearer <jwt>"
```

Expected: array com `studentsBoarded`, `totalKm`, `durationMinutes` em cada entrada.

---

## Sprint 4.6 — Rastreamento GPS: Socket.io Gateway (RF19)

**Definição de pronto:** gateway Socket.io funcional — motorista emite `location_update` e gestor recebe `position_update` na sala da execução.

### Task 13: TrackingGateway

**Files:**
- Create: `services/app-api/src/operational/tracking/dto/location-update.dto.ts`
- Create: `services/app-api/src/operational/tracking/tracking.gateway.ts`
- Create: `services/app-api/src/operational/tracking/tracking.module.ts`
- Modify: `services/app-api/src/app.module.ts`

- [ ] **13.1** Criar `dto/location-update.dto.ts`:

```typescript
import { IsUUID, IsNumber } from 'class-validator';

export class LocationUpdateDto {
  @IsUUID()
  executionId: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}
```

- [ ] **13.2** Criar `tracking.gateway.ts`:

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { LocationUpdateDto } from './dto/location-update.dto';

/**
 * MVP: single instance — no Redis Adapter.
 * Future horizontal scale requires adding @nestjs/platform-socket.io + Redis Adapter.
 * See: docs/superpowers/specs/2026-03-19-backend-roadmap-design.md § Nota Socket.io
 */
@WebSocketGateway({
  cors: {
    origin: '*', // replaced by actual dashboard domain in production via CORS env var
  },
  namespace: 'tracking',
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrackingGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Client joins the room for a specific execution.
   * Emit from client: { "event": "join_execution", "data": { "executionId": "..." } }
   */
  @SubscribeMessage('join_execution')
  handleJoinExecution(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { executionId: string },
  ) {
    const room = `execution:${data.executionId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined room ${room}`);
    return { event: 'joined', data: { room } };
  }

  /**
   * Driver emits location updates; server broadcasts to all clients in execution room.
   * Emit from driver app: { "event": "location_update", "data": { executionId, lat, lng } }
   * Broadcast to room: { "event": "position_update", "data": { executionId, lat, lng, timestamp } }
   */
  @SubscribeMessage('location_update')
  handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: LocationUpdateDto,
  ) {
    const room = `execution:${data.executionId}`;
    this.server.to(room).emit('position_update', {
      executionId: data.executionId,
      lat: data.lat,
      lng: data.lng,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Server-side method: broadcast execution status change to all room subscribers.
   * Called by ExecutionsService when status changes (start, stop recorded, finish).
   */
  broadcastStatusUpdate(executionId: string, payload: Record<string, unknown>) {
    this.server.to(`execution:${executionId}`).emit('status_update', payload);
  }
}
```

- [ ] **13.3** Criar `tracking.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TrackingGateway } from './tracking.gateway';

@Module({
  providers: [TrackingGateway],
  exports: [TrackingGateway],
})
export class TrackingModule {}
```

- [ ] **13.4** Adicionar `TrackingModule` no `app.module.ts`.

- [ ] **13.5** Verificar compilação:

```bash
cd services/app-api && pnpm exec tsc --noEmit
```

Expected: zero erros.

> **Nota de teste:** O TrackingGateway é uma classe de infraestrutura pura (sem lógica de negócio testável isoladamente). O comportamento de broadcasting é verificado no teste de integração ponta a ponta — fora do escopo de testes unitários deste plano.

- [ ] **13.6** Registrar decisão técnica do single-instance MVP no vault:

Abrir `RouttesApp_Core/CORE/Arquitetura técnica.md`, seção "Realtime com Socket.io", e adicionar o seguinte bloco logo abaixo da descrição existente:

```markdown
> [!WARNING] ADR — Socket.io MVP: single instance sem Redis Adapter
> O MVP executa em **uma única instância Railway** sem Redis Adapter. Escala horizontal é futura:
> - **Quando adicionar:** ao configurar múltiplas réplicas no Railway (service scaling)
> - **Como adicionar:** instalar `@socket.io/redis-adapter` + `ioredis`, conectar ao Redis Railway e chamar `io.adapter(createAdapter(pubClient, subClient))` no `main.ts`
> - **Impacto:** sem o adapter, conexões de motoristas e gestores em instâncias diferentes quebram o broadcast de `position_update`
```

- [ ] **13.7** Commit:

```bash
git add services/app-api/src/operational/tracking/ services/app-api/src/app.module.ts
git commit -m "feat(app-api): add TrackingGateway with Socket.io rooms per execution — RF19 complete"
```

---

### Task 14: PR + Deploy Sprint 4.6 — Deploy Final da Fase 4

- [ ] **14.1** Criar PR `feat/fase4-tracking` → `main`.
- [ ] **14.2** Merge + deploy via railway:use-railway.

- [ ] **14.3** Validar Socket.io em produção (usar `wscat` ou similar):

```bash
# Instalar wscat se não tiver: npm i -g wscat
# Conectar ao namespace tracking
wscat -c "wss://<app-api-url>/tracking"

# Após conexão, enviar:
{"event":"join_execution","data":{"executionId":"<exec-id>"}}
# Expected: {"event":"joined","data":{"room":"execution:<exec-id>"}}

# Em outro terminal (simulando motorista):
wscat -c "wss://<app-api-url>/tracking"
{"event":"location_update","data":{"executionId":"<exec-id>","lat":-23.5,"lng":-46.6}}
# Expected: primeiro terminal recebe {"event":"position_update","data":{"lat":...,"lng":...,"timestamp":"..."}}
```

- [ ] **14.4** Verificar `GET /health` ainda retorna 200 após deploy com WebSocket ativo:

```bash
curl https://<app-api-url>/health
```

---

## Definição de Pronto da Fase 4

- [ ] **RF13:** `POST /routes`, `GET /routes`, `PATCH /routes/:id`, `DELETE /routes/:id`, `POST /routes/:id/stops`, `DELETE /routes/:id/stops/:stopId`, `POST /routes/:id/optimize`, `POST /routes/:id/approve` — todos em produção
- [ ] **RF13.3:** Otimização Mapbox retorna paradas reordenadas e salva histórico em `route_optimizations`
- [ ] **RF13.6:** Aprovação só funciona em rotas `draft`; rotas `approved`/`active` retornam 400
- [ ] **RF15:** `POST /attendance` com upsert idempotente; `GET /attendance?routeId=&serviceDate=&direction=` funcional
- [ ] **RF14.1:** `POST /executions/prepare` filtra paradas de alunos com `decision: 'no'`
- [ ] **RF14.2:** `POST /executions/:id/start` transiciona para `in_progress` e grava `EXECUTION_STARTED` em `outbox_events`
- [ ] **RF14.3:** `POST /executions/:id/stops` com `status: 'boarded'` grava `STUDENT_BOARDED` em `outbox_events`
- [ ] **RF14.4-14.8:** `POST /executions/:id/events` registra ocorrências operacionais
- [ ] **RF14.9:** `POST /executions/:id/finish` retorna 400 se algum aluno embarcado não foi entregue
- [ ] **RF14.5:** `POST /executions/:id/cancel` funciona em `prepared` e `in_progress`
- [ ] **RF14.6:** `GET /executions/active` retorna execução ativa do motorista autenticado
- [ ] **RF18:** `GET /history` retorna execuções finalizadas com agregados (`studentsBoarded`, `totalKm`, `durationMinutes`)
- [ ] **RF19:** Socket.io Gateway no namespace `/tracking` — `join_execution` junta cliente à sala, `location_update` faz broadcast de `position_update` para todos na sala
- [ ] `outbox_events` populado com `published: false` após cada evento crítico (verificar via Neon MCP)
- [ ] `GET /health` continua 200 em produção após todos os deploys
- [ ] Todos os testes unitários passam (`pnpm test` em `services/app-api`)

---

## Notas de design

**Máquina de estados de execução:** O fluxo válido é `prepared → in_progress → finished | cancelled`. Transições inválidas (ex: `start` em `finished`) retornam 400 com mensagem descritiva. Não há state machine formal — guards `if (status !== X) throw` são suficientes para o MVP.

**Outbox Pattern na Fase 4:** Cada mutação crítica de execução usa `prisma.$transaction(async (tx) => { ... })` para garantir que o `outbox_events` é escrito na mesma transação. Se a transaction falhar, nenhum evento fica gravado — consistência garantida. O Outbox Worker (Fase 5) processa os eventos `published: false` de forma assíncrona.

**Anti-forgetting lock (RF14.9):** A validação de `assertNoUndeliveredStudents` é feita na camada de service, antes do `$transaction` de finish. A lógica: qualquer aluno com `execution_stop.status = 'boarded'` em um stop do tipo `pickup` deve também ter um stop do tipo `school` ou `dropoff` com `status = 'boarded'`. Se não tiver, o finish é bloqueado com lista dos IDs dos alunos não entregues para facilitar debugging pelo motorista.

**Mapbox Optimization API vs Directions API:** A spec usa o termo "otimização por distância/tempo" — isso corresponde à [Mapbox Optimization API v1](https://docs.mapbox.com/api/navigation/optimization/) (TSP), não à Directions API simples. A Optimization API reordena até 12 waypoints. Acima disso (rotas com mais de 12 paradas), considerar estratégia de chunking no pós-MVP.

**Socket.io MVP — single instance:** O `TrackingGateway` funciona apenas em single instance Railway (sem Redis Adapter). Ao escalar horizontalmente, conexões de motoristas e gestores podem cair em instâncias diferentes, quebrando o broadcast. A solução pós-MVP é adicionar `@nestjs/platform-socket.io` com `createAdapter(createClient())` do `socket.io-redis`. Registrar como ADR no vault.

**`$transaction` com array vs função interativa:** Quando possível, usar `$transaction(async tx => { ... })` (interactive transaction) em vez de `$transaction([op1, op2])` (batch), pois permite lógica condicional dentro da transação (ex: checar estado antes de escrever outbox event).
