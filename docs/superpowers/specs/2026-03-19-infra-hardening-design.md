# Infra Hardening — Design Spec
**Data:** 2026-03-19
**Escopo:** app-api (primário) + management-api (throttler e circuit breaker apenas)
**Abordagem aprovada:** B — NestJS Native

---

## Contexto

O Routtes é uma plataforma SaaS multitenant de gestão de transporte escolar. Esta spec cobre a camada de hardening de segurança, resiliência e performance das APIs NestJS, preparando o sistema para produção com capacidade de escala incremental.

**Tópicos cobertos:**
1. Infraestrutura Redis compartilhada
2. Rate Limit por IP
3. RBAC — Matriz de permissões completa
4. Circuit Breaker para integrações externas
5. BullMQ — Processamento assíncrono de jobs
6. Cache Redis — Dados de rota, listagens e Mapbox

---

## 1. Infraestrutura Redis

Redis é o alicerce compartilhado de BullMQ, Cache e Throttler. Um único serviço Redis no Railway serve os três propósitos com prefixos distintos.

**Prefixos de namespace:**
```
bull:       → filas BullMQ
cache:      → dados cacheados
throttle:   → contadores de rate limit
```

**Variáveis de ambiente (Railway):**
```
REDIS_URL=redis://...
```

**Estrutura de módulos em `src/shared/`:**
```
src/shared/
├── redis/
│   └── redis.module.ts          ← conexão ioredis global (global: true)
├── cache/
│   └── cache.module.ts          ← @nestjs/cache-manager com Redis store
├── throttler/
│   └── throttler.module.ts      ← @nestjs/throttler com Redis store
├── bull/
│   └── bull.module.ts           ← @nestjs/bullmq
└── circuit-breaker/
    └── circuit-breaker.service.ts
```

`RedisModule` é registrado como `global: true` — conexão única injetada nos demais módulos.

---

## 2. Rate Limit

**Pacote:** `@nestjs/throttler` com `ThrottlerStorageRedisService`

**Duas camadas com comportamento explícito:**

| Camada | Escopo | Limite | Mecanismo |
|---|---|---|---|
| Global | Todos os endpoints (exceto auth) | 10 req/s por IP | `ThrottlerGuard` global |
| Auth | `POST /auth/login`, `POST /auth/refresh` | 5 req / 60s por IP | `@SkipThrottle()` no global + `@Throttle({ auth: { limit: 5, ttl: 60000 } })` no handler |

Os endpoints de auth recebem `@SkipThrottle()` para desativar o guard global e `@Throttle()` próprio mais restritivo. As duas camadas **não se acumulam** — auth routes têm apenas o throttle próprio.

**Resposta ao exceder:** `429 Too Many Requests` com header `Retry-After`.

---

## 3. RBAC — Matriz de Permissões

### Escopo por API

- **app-api:** `PermissionGuard` completo com matrix `role_permissions` no banco. Substitui qualquer guard de role simples existente.
- **management-api:** mantém o `RolesGuard` atual (`@Roles('superadmin')`) — acesso é binário (superadmin ou não), matrix completa é desnecessária neste contexto.

### Roles do sistema

Valores devem corresponder exatamente ao enum `UserRole` em `packages/shared`:

```typescript
// packages/shared/src/types/user-role.enum.ts
export enum UserRole {
  SUPERADMIN = 'superadmin',
  MANAGER    = 'manager',
  DRIVER     = 'driver',
  GUARDIAN   = 'guardian',
}
```

### Tabela no banco

Schema: `app` (alinhado com o padrão do projeto).

```sql
CREATE TABLE app.role_permissions (
  role        TEXT NOT NULL,  -- 'superadmin' | 'manager' | 'driver' | 'guardian'
  resource    TEXT NOT NULL,  -- 'rota' | 'execucao' | 'aluno' | 'driver' | ...
  action      TEXT NOT NULL,  -- 'criar' | 'ler' | 'editar' | 'deletar' | 'executar'
  PRIMARY KEY (role, resource, action)
);
```

Número da migration: a ser definido no plano de implementação conforme sequência atual.

**Nota sobre `guardian`:** O role `guardian` (responsável) tem acesso somente leitura a dados do aluno vinculado via app mobile. As permissões iniciais devem incluir `('guardian', 'aluno', 'ler')` e `('guardian', 'execucao', 'ler')`.

### Guard e decorator

```typescript
@Get('routes')
@RequirePermission('rota', 'ler')
findAll() { ... }

@Post('routes/:id/start')
@RequirePermission('execucao', 'executar')
startExecution() { ... }
```

### Fluxo do PermissionGuard

```
Request
  → JwtAuthGuard       (valida JWT)
  → TenantGuard        (injeta tenant_id)
  → PermissionGuard    (valida permissão)
        │
        ├── Extrai role do JWT payload
        ├── Checa Redis (TTL 30s)
        │     hit  → usa resultado cacheado
        │     miss → consulta app.role_permissions no banco → cacheia
        └── 403 ou passa
```

**Staleness aceitável:** 30s de TTL no cache de permissões significa que uma revogação de permissão pode levar até 30s para ser efetiva. Este tradeoff é aceito — o custo de cache miss em cada request é maior que o risco de 30s de janela de staleness para uma plataforma de transporte escolar.

### Separação de responsabilidades

- **PermissionGuard:** valida se o *role* pode executar a *ação* sobre o *recurso*
- **Service:** valida se o *recurso específico* pertence ao tenant/usuário (ex: `driver` só acessa rotas atribuídas a ele, não todas do tenant)

---

## 4. Circuit Breaker

**Pacote:** `opossum` encapsulado em `CircuitBreakerService` injetável via DI.

### Integrações protegidas e configurações

| Integração | timeout | errorThreshold | resetTimeout | Fallback |
|---|---|---|---|---|
| Firebase Auth | 3s | 30% | 15s | Lança `ServiceUnavailableException` (503) — sem fallback seguro |
| Mapbox | 5s | 50% | 30s | Retorna rota em cache (se disponível) ou lança `503` com mensagem `"route optimization unavailable"` |
| WhatsApp | 8s | 60% | 60s | Reenfileira job em `bull:messaging` com backoff de 60s |
| Neon (health check) | 2s | 20% | 10s | Registra alerta em `audit_logs`, não bloqueia requests |

**FCM não tem circuit breaker** — jobs FCM passam por BullMQ com retry nativo. Falhas de FCM são isoladas por job, não têm impacto em cascata.

### Estados

```
CLOSED    → passa requisições normalmente
OPEN      → rejeita imediatamente (fail fast) após threshold atingido
HALF-OPEN → testa com 1 requisição para verificar recuperação
```

### Uso nos services

```typescript
const user = await this.circuitBreaker.fire('firebase-auth',
  () => this.firebaseAdmin.verifyIdToken(token)
)
```

---

## 5. BullMQ — Processamento Assíncrono

**Pacote:** `@nestjs/bullmq` (adapter dedicado BullMQ — não usar `@nestjs/bull` + `bull` separados para evitar conflito de versão).

### Filas

| Fila | Responsabilidade | Tentativas | Backoff |
|---|---|---|---|
| `bull:notifications` | FCM push notifications | 3 | Exponencial 2s |
| `bull:messaging` | WhatsApp (embarque, desembarque, cancelamento) | 5 | Exponencial 5s |
| `bull:outbox` | Polling de `outbox_events` e despacho para outras filas | 3 | Fixo 3s |
| `bull:reports` | Geração de relatórios e exportações | 1 | — |
| `bull:sync` | Sincronização de dados offline do Flutter | 5 | Exponencial 10s |

### Fluxo do Outbox Worker

O worker de outbox usa `@nestjs/schedule` com `@Interval(5000)` (não `setInterval` raw) para garantir que apenas uma instância execute por vez em deploy multi-réplica (via lock distribuído no Redis com `redlock`).

**Garantia de entrega:** at-least-once com idempotência nos processors.

```
Worker (a cada 5s, com distributed lock)
  │
  ▼
BEGIN TRANSACTION
  SELECT * FROM app.outbox_events
  WHERE published = false
  AND processing = false
  LIMIT 50
  FOR UPDATE SKIP LOCKED            ← evita que múltiplas instâncias peguem o mesmo registro
  │
  UPDATE SET processing = true      ← marca como "em processamento" dentro da transação
COMMIT
  │
  ├── EXECUTION_STARTED  → bull:notifications
  ├── STUDENT_BOARDED    → bull:messaging
  ├── STUDENT_DELIVERED  → bull:messaging
  ├── ROUTE_CANCELLED    → bull:messaging + bull:notifications
  └── EXECUTION_FINISHED → bull:reports (consolidar métricas)
  │
  ▼
UPDATE SET published = true, processing = false WHERE id IN (...)
```

**Idempotência nos processors:** cada job carrega o `outbox_event_id`. Antes de executar, o processor checa se o evento já foi processado (via campo `published = true`). Se sim, descarta o job silenciosamente.

**Importante:** o check de `published = true` evita re-despacho no polling loop, mas **não** garante idempotência da ação externa em si. Cada processor é também responsável por idempotência na chamada externa — ex: o processor FCM deve checar se a notificação já foi enviada (via registro na tabela `notifications`), e o processor WhatsApp deve usar uma chave de idempotência no envio. A garantia é at-least-once; os efeitos colaterais externos devem ser idempotentes.

**Coluna adicional na tabela `outbox_events`:**
```sql
ALTER TABLE app.outbox_events ADD COLUMN processing BOOLEAN NOT NULL DEFAULT false;

-- Substituir o índice parcial existente (que filtra só por published)
-- para cobrir também a coluna processing, evitando full scan de rows em processamento:
DROP INDEX IF EXISTS app_outbox_pending_idx;
CREATE INDEX app_outbox_pending_idx ON app.outbox_events(created_at)
  WHERE published = false AND processing = false;
```

### Estrutura de módulos

```
src/shared/workers/
├── workers.module.ts
├── processors/
│   ├── notification.processor.ts
│   ├── messaging.processor.ts
│   ├── outbox.processor.ts
│   ├── reports.processor.ts
│   └── sync.processor.ts
└── producers/
    └── job.producer.ts     ← injetado onde precisar enfileirar
```

### Uso nos services

```typescript
await this.jobProducer.enqueue('notifications', {
  outboxEventId, userId, tenantId, title, body
})
```

### Nota de evolução

O `WorkerModule` é desenhado para ser extraído como serviço separado no Railway (`worker-service`) sem reescrita — apenas separando o entry point.

---

## 6. Cache Redis

**Pacote:** `@nestjs/cache-manager` com Redis store
**Pattern:** cache-aside com decorator `@Cacheable` customizado

### O que cachear

| Dado | TTL | Chave |
|---|---|---|
| Rota do dia (para execução) | 5 min (300s) | `cache:route:{tenantId}:{routeId}:{date}` |
| Listagem de alunos por rota | 60s | `cache:students:{tenantId}:{routeId}` |
| Histórico paginado | 60s | `cache:history:{tenantId}:{page}:{filters_hash}` |
| Otimização Mapbox | 24h (86400s) | `cache:mapbox:{origin_hash}:{waypoints_hash}` |

`tenantId` sempre compõe a chave — garante isolamento de cache por tenant.

### Invalidação com SCAN + DEL

`cache-manager` não suporta wildcard delete nativamente. A invalidação por padrão usa `ioredis` diretamente via `SCAN` + `DEL` em loop (nunca `KEYS *` em produção):

```typescript
// CacheService.deleteByPattern(pattern: string)
const stream = this.redis.scanStream({ match: pattern, count: 100 })
stream.on('data', (keys) => { if (keys.length) this.redis.del(...keys) })
```

| Evento | Padrão de invalidação |
|---|---|
| Rota editada | `cache:route:{tenantId}:{routeId}:*` |
| Aluno adicionado/removido da rota | `cache:students:{tenantId}:{routeId}` |
| Mapbox | Sem invalidação — TTL 24h é suficiente |

### Uso nos services

```typescript
@Cacheable('route', { ttl: 300 })
async getRouteForExecution(tenantId: string, routeId: string, date: string) {
  return this.prisma.route.findFirst({ where: { tenantId, id: routeId } })
}
```

---

## Dependências a instalar

```bash
# Rate Limit
pnpm add @nestjs/throttler

# Cache
pnpm add @nestjs/cache-manager cache-manager cache-manager-ioredis-yet

# BullMQ (adapter dedicado — não instalar @nestjs/bull nem bull separadamente)
pnpm add @nestjs/bullmq bullmq

# Circuit Breaker
pnpm add opossum
pnpm add -D @types/opossum

# Scheduler (para outbox worker)
pnpm add @nestjs/schedule

# Redis client compartilhado
pnpm add ioredis

# Distributed lock (para outbox worker multi-instância)
pnpm add redlock
```

---

## Ordem de implementação sugerida

1. **Redis Module** — base de tudo
2. **Throttler** — proteção imediata dos endpoints de auth
3. **RBAC** — migration `app.role_permissions` + `processing` column em `outbox_events` + `PermissionGuard` + decorator
4. **Circuit Breaker** — `CircuitBreakerService` + integrar nos services existentes
5. **BullMQ** — `WorkersModule` + processors + `JobProducer` + outbox worker com lock
6. **Cache** — `CacheModule` + `@Cacheable` + `CacheService.deleteByPattern` + integrar nos services de rota

---

## Não coberto nesta spec

- Socket.io Redis Adapter (escala horizontal de WebSocket) — próxima fase
- HPA / Railway auto-scale — próxima fase
- Observabilidade de filas (BullMQ dashboard) — próxima fase
