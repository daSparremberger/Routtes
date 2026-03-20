# Infra Hardening — Design Spec
**Data:** 2026-03-19
**Escopo:** app-api + management-api
**Abordagem aprovada:** B — NestJS Native

---

## Contexto

O Routtes é uma plataforma SaaS multitenant de gestão de transporte escolar. Esta spec cobre a camada de hardening de segurança, resiliência e performance das APIs NestJS (`app-api` e `management-api`), preparando o sistema para produção com capacidade de escala incremental.

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
REDIS_TTL_DEFAULT=60
```

**Estrutura de módulos em `src/shared/`:**
```
src/shared/
├── redis/
│   └── redis.module.ts          ← conexão ioredis global
├── cache/
│   └── cache.module.ts          ← @nestjs/cache-manager com Redis store
├── throttler/
│   └── throttler.module.ts      ← @nestjs/throttler com Redis store
├── bull/
│   └── bull.module.ts           ← @nestjs/bull (BullMQ)
└── circuit-breaker/
    └── circuit-breaker.service.ts
```

`RedisModule` é registrado como `global: true` — conexão única injetada nos demais módulos.

---

## 2. Rate Limit

**Pacote:** `@nestjs/throttler` com `ThrottlerStorageRedisService`

**Duas camadas:**

| Camada | Escopo | Limite |
|---|---|---|
| Global | Todos os endpoints | 10 req/s por IP |
| Auth override | `POST /auth/login`, `POST /auth/refresh` | 5 req / 60s por IP |

**Resposta ao exceder:** `429 Too Many Requests` com header `Retry-After`.

---

## 3. RBAC — Matriz de Permissões

### Tabela no banco
```sql
CREATE TABLE role_permissions (
  role        TEXT NOT NULL,  -- 'superadmin' | 'gestor' | 'motorista'
  resource    TEXT NOT NULL,  -- 'rota' | 'execucao' | 'aluno' | 'motorista' | ...
  action      TEXT NOT NULL,  -- 'criar' | 'ler' | 'editar' | 'deletar' | 'executar'
  PRIMARY KEY (role, resource, action)
);
```

### Guard e decorator
```typescript
// Decorator no controller
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
        │     miss → consulta role_permissions no banco → cacheia
        └── 403 ou passa
```

### Separação de responsabilidades
- **PermissionGuard:** valida se o *role* pode executar a *ação* sobre o *recurso*
- **Service:** valida se o *recurso específico* pertence ao tenant/usuário (ex: motorista só acessa suas próprias rotas)

---

## 4. Circuit Breaker

**Pacote:** `opossum` encapsulado em `CircuitBreakerService` injetável via DI.

### Integrações protegidas e configurações

| Integração | timeout | errorThreshold | resetTimeout | Fallback |
|---|---|---|---|---|
| Firebase Auth | 3s | 30% | 15s | `ServiceUnavailableException` |
| Mapbox | 5s | 50% | 30s | Cache da rota ou erro controlado |
| WhatsApp | 8s | 60% | 60s | Reenfileira no BullMQ com backoff |
| Neon (health) | 2s | 20% | 10s | Log de alerta, não bloqueia |

**FCM não tem circuit breaker** — jobs FCM passam por BullMQ com retry nativo.

### Estados
```
CLOSED    → passa requisições normalmente
OPEN      → rejeita imediatamente (fail fast) após threshold atingido
HALF-OPEN → testa com 1 requisição para verificar recuperação
```

### Uso nos services
```typescript
const result = await this.circuitBreaker.fire('firebase-auth',
  () => this.firebaseAdmin.verifyIdToken(token)
)
```

---

## 5. BullMQ — Processamento Assíncrono

**Pacote:** `@nestjs/bull` (adapter BullMQ)

### Filas

| Fila | Responsabilidade | Tentativas | Backoff |
|---|---|---|---|
| `bull:notifications` | FCM push notifications | 3 | Exponencial 2s |
| `bull:messaging` | WhatsApp (embarque, desembarque, cancelamento) | 5 | Exponencial 5s |
| `bull:outbox` | Processa `outbox_events` e dispara efeitos colaterais | 3 | Fixo 3s |
| `bull:reports` | Geração de relatórios e exportações | 1 | — |
| `bull:sync` | Sincronização de dados offline do Flutter | 5 | Exponencial 10s |

### Fluxo do Outbox Worker
```
Worker polling (a cada 5s)
  │
  ▼
SELECT * FROM outbox_events WHERE published = false LIMIT 50
  │
  ├── EXECUTION_STARTED  → bull:notifications
  ├── STUDENT_BOARDED    → bull:messaging
  ├── STUDENT_DELIVERED  → bull:messaging
  ├── ROUTE_CANCELLED    → bull:messaging + bull:notifications
  └── EXECUTION_FINISHED → bull:reports (consolidar métricas)
  │
  ▼
UPDATE outbox_events SET published = true WHERE id IN (...)
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
  userId, tenantId, title, body
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
| Rota do dia (para execução) | 5 min | `cache:route:{tenantId}:{routeId}:{date}` |
| Listagem de alunos por rota | 60s | `cache:students:{tenantId}:{routeId}` |
| Histórico paginado | 60s | `cache:history:{tenantId}:{page}:{filters_hash}` |
| Otimização Mapbox | 24h | `cache:mapbox:{origin_hash}:{waypoints_hash}` |

`tenantId` sempre compõe a chave — garante isolamento de cache por tenant.

### Invalidação

| Evento | Invalidação |
|---|---|
| Rota editada | `delete cache:route:{tenantId}:{routeId}:*` |
| Aluno adicionado/removido da rota | `delete cache:students:{tenantId}:{routeId}` |
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

# BullMQ
pnpm add @nestjs/bull bull bullmq

# Circuit Breaker
pnpm add opossum
pnpm add -D @types/opossum

# Redis client compartilhado
pnpm add ioredis
```

---

## Ordem de implementação sugerida

1. **Redis Module** — base de tudo
2. **Throttler** — proteção imediata dos endpoints de auth
3. **RBAC** — migration + PermissionGuard + decorator
4. **Circuit Breaker** — CircuitBreakerService + integrar nos services existentes
5. **BullMQ** — WorkersModule + processors + JobProducer
6. **Cache** — CacheModule + @Cacheable + integrar nos services de rota

---

## Não coberto nesta spec

- Socket.io Redis Adapter (escala horizontal de WebSocket) — próxima fase
- HPA / Railway auto-scale — próxima fase
- Observabilidade de filas (BullMQ dashboard) — próxima fase
