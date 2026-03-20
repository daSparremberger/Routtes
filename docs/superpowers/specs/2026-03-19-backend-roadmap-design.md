# Routtes — Backend Roadmap: Design Spec

**Data:** 2026-03-19
**Escopo:** Backend exclusivamente — `management-api` + `app-api` + infraestrutura Railway
**Abordagem:** Foundation first → sprints paralelos por domínio → deploy contínuo em produção

---

## 1. Contexto e Estado Atual

- **Documentação:** 100% completa no vault (`RouttesApp_Core/CORE/`)
- **Código:** zero — tudo a construir do zero
- **Banco (Neon):** projeto `routteapp-db` existe, branch `production` pronta, banco vazio (zero schemas, zero tabelas, zero migrations)
- **Railway:** CLI autenticado, nenhum serviço criado ainda
- **Firebase:** projeto `routtes-app` ativo
- **GitHub:** repo `daSparremberger/Routtes` existe e vazio
- **MCPs disponíveis:** Neon, Railway, GitHub, Firebase — todos conectados

---

## 2. Fora do Escopo deste Plano (MVP)

Os seguintes requisitos são **explicitamente excluídos** do MVP e não serão implementados:

| RF | Módulo | Motivo |
|---|---|---|
| RF16 | Financeiro Operacional | Pós-MVP — ver Documento de Escopo |
| RF17 | Mensagens / Chat interno | Pós-MVP — ver Documento de Escopo |
| — | Frontend Next.js | Escopo separado (Antigravity/Gemini) |
| — | Flutter mobile | Escopo separado |

---

## 3. Decisões Técnicas

| Decisão | Escolha | Motivo |
|---|---|---|
| Gerenciador de pacotes | pnpm | Performance, workspaces nativos |
| Build pipeline | Turborepo | Cache inteligente no monorepo |
| Framework backend | NestJS (TypeScript) | Definido na stack do projeto |
| ORM | Prisma Client | DX alta, tipagem forte |
| Migrations | SQL puro via Neon MCP | Controle total, sem `prisma migrate` |
| Prisma schema | Um `schema.prisma` por API, datasource com `schemas = ["management"]` / `schemas = ["app"]` (Prisma multi-schema preview) | Cada API acessa apenas seu schema Neon |
| Autenticação | Firebase Admin + JWT próprio | Definido na arquitetura |
| Realtime | Socket.io Gateway NestJS — **single instance no MVP** (sem Redis Adapter) | MVP roda em 1 instância Railway; Redis Adapter é evolução futura |
| Deploy | Railway MCP — após cada sprint completo | Validação contínua em produção |
| Secrets | Railway env vars — nunca em código | Regra inegociável |

---

## 4. Concerns Transversais (todos implementados na Fase 0)

Estes itens são implementados **uma única vez na Fase 0** e se aplicam a ambas as APIs:

### 4.1 Tratamento de Erros
- **Global exception filter:** mapeia exceções Prisma para HTTP (P2002 → 409, P2025 → 404, erros desconhecidos → 500)
- **Formato de resposta de erro unificado:** `{ statusCode, message, code }`
- Implementado como `AllExceptionsFilter` registrado globalmente no `main.ts`

### 4.2 Validação de Entrada
- `ValidationPipe` global com `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- `class-validator` + `class-transformer` em todos os DTOs

### 4.3 CORS
- Habilitado em ambas as APIs
- Origens permitidas em produção: URL do dashboard Next.js no Railway + localhost em dev
- `credentials: true` (Authorization header com JWT)

### 4.4 Logging
- `Logger` nativo do NestJS com prefixo por contexto
- Middleware de request/response logging (método, path, status, duração)
- Sem log de tokens, senhas ou payloads sensíveis

### 4.5 Validação de Ambiente na Inicialização
- `@nestjs/config` + validação via `Joi` ou `zod` no `AppModule`
- Aplicação falha loudly no startup se variável obrigatória estiver ausente
- Variáveis validadas: `DATABASE_URL`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `JWT_SECRET`, `PORT`

### 4.6 Health Check
- Endpoint `GET /health` retorna 200 + status de conectividade com Neon
- Usado pelo Railway para verificação de saúde do container

---

## 5. Estrutura do Monorepo

```
Routtes/
├── package.json                  ← pnpm workspace root
├── pnpm-workspace.yaml
├── turbo.json                    ← Turborepo pipeline
├── .env.example                  ← vars documentadas, sem valores reais
├── .gitignore
│
├── packages/
│   └── shared/                   ← tipos + enums compartilhados entre APIs
│       ├── package.json
│       └── src/
│           ├── types/            ← DTOs e enums exportados
│           └── index.ts
│
└── services/
    ├── management-api/           ← NestJS, porta 3000
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── src/
    │   │   ├── main.ts           ← CORS, ValidationPipe, GlobalFilter, Logger
    │   │   ├── app.module.ts     ← @nestjs/config com validação de env
    │   │   ├── prisma/           ← PrismaService + schema.prisma (schema: management)
    │   │   ├── auth/             ← Firebase Admin + JWT superadmin + RoleGuard
    │   │   ├── admin/
    │   │   │   ├── tenants/
    │   │   │   ├── organizations/
    │   │   │   ├── contracts/
    │   │   │   ├── invoices/
    │   │   │   ├── licenses/
    │   │   │   └── modules/
    │   │   └── shared/           ← AllExceptionsFilter, AuditInterceptor
    │   └── db/
    │       └── migrations/
    │           └── 001_initial_schema.sql
    │
    └── app-api/                  ← NestJS, porta 3001
        ├── package.json
        ├── tsconfig.json
        ├── src/
        │   ├── main.ts
        │   ├── app.module.ts
        │   ├── prisma/           ← PrismaService + schema.prisma (schema: app)
        │   ├── auth/             ← Firebase Admin + JWT gestor/motorista + TenantGuard
        │   ├── operational/
        │   │   ├── students/
        │   │   ├── drivers/
        │   │   ├── vehicles/
        │   │   ├── schools/
        │   │   ├── routes/       ← inclui integração Mapbox Directions API
        │   │   ├── executions/   ← trava anti-esquecimento (RF14.9)
        │   │   ├── attendance/
        │   │   ├── tracking/     ← Socket.io Gateway
        │   │   └── history/
        │   ├── communication/
        │   │   └── notifications/ ← FCM via Firebase MCP
        │   └── shared/           ← TenantGuard, AuditInterceptor, OutboxWorker
        └── db/
            └── migrations/
                └── 001_initial_schema.sql
```

---

## 6. Infraestrutura

### GitHub
- Repo: `daSparremberger/Routtes` (já existe, vazio)
- Branch `main` protegida — sem push direto
- Convenção de branches: `feat/<domínio>`, `fix/<desc>`, `infra/<desc>`
- Todo código via PR

### Neon
- Projeto: `routteapp-db` (ID: `muddy-frost-12750766`)
- Branch principal: `production`
- **Schema `management`** → management-api (Prisma datasource aponta para este schema)
- **Schema `app`** → app-api (Prisma datasource aponta para este schema)
- Migration 001 cria ambos os schemas e todas as tabelas de uma vez
- Fluxo seguro: branch Neon de teste → aplicar SQL → `compare_database_schema` → aplicar em production → deletar branch
- `prisma db pull` gera Prisma Client após migration aplicada

### Railway
- 1 projeto: `Routtes`
- 2 serviços: `management-api` e `app-api`
- 2 ambientes: `production` e `staging`
- Deploy automático via merge em `main`

**Variáveis obrigatórias por serviço:**

| Variável | management-api | app-api |
|---|---|---|
| `DATABASE_URL` | ✅ | ✅ |
| `FIREBASE_PROJECT_ID` | ✅ | ✅ |
| `FIREBASE_CLIENT_EMAIL` | ✅ | ✅ |
| `FIREBASE_PRIVATE_KEY` | ✅ | ✅ |
| `JWT_SECRET` | ✅ | ✅ |
| `JWT_EXPIRY` | ✅ | ✅ |
| `JWT_REFRESH_EXPIRY` | ✅ | ✅ |
| `MAPBOX_TOKEN` | — | ✅ |
| `WHATSAPP_API_TOKEN` | — | ✅ |
| `PORT` | ✅ | ✅ |

### Regra de deploy
> **Cada sprint termina com deploy em produção no Railway via MCP.** Nenhum módulo fica sem subir. O ciclo é: implementar → PR → merge → deploy → validar em produção. Na Fase 0, o único deploy é ao final do passo 0.9.

---

## 7. Sprints de Implementação

> **Execução sequencial para agente único.** Quando fases são indicadas como "paralelas", significa que na prática um agente único alterna entre as duas APIs sprint a sprint — primeiro um módulo da management-api, depois um da app-api — sem necessidade de bloquear uma pelo término da outra.

> **Phase 1 inicia apenas após os passos 0.7 e 0.8 concluídos** (migration aplicada e Prisma Client gerado), pois auth depende da tabela `users`/`admins` existir no banco.

---

### Fase 0 — Setup (bloqueante para tudo)

**Definição de pronto:** ambas as APIs respondem `GET /health` em produção no Railway com status 200 e confirmação de conectividade com Neon.

| # | Tarefa | Ferramenta |
|---|---|---|
| 0.1 | Criar estrutura do monorepo local (pnpm, Turborepo, pastas) | — |
| 0.2 | Init git + push para `daSparremberger/Routtes` | GitHub MCP |
| 0.3 | Criar projeto + 2 serviços (`management-api`, `app-api`) + ambientes no Railway | Railway MCP |
| 0.4 | Configurar todas as env vars em ambos os serviços no Railway | Railway MCP |
| 0.5 | NestJS skeleton completo: CORS, ValidationPipe, GlobalFilter, Logger, @nestjs/config + env validation, health check `/health` | — |
| 0.6 | Escrever `001_initial_schema.sql` com todos os domínios (schemas `management` e `app`) | — |
| 0.7 | Aplicar migration 001 via Neon MCP: branch teste → validar → production | Neon MCP |
| 0.8 | `prisma db pull` → gerar Prisma Client nas duas APIs | — |
| 0.9 | PR + merge + deploy → validar `/health` em produção (200 + DB ping) | Railway MCP |

---

### Fase 1 — Auth (inicia após 0.8)

**Paralelo:** agente implementa auth nas duas APIs antes de qualquer feature.
**Definição de pronto:** `POST /auth/login` funciona em produção em ambas as APIs, retornando JWT válido.

| API | Conteúdo | RFs |
|---|---|---|
| management-api | Firebase Admin SDK + verificação de idToken + emissão de JWT superadmin + RoleGuard | RF08 |
| app-api | Firebase Admin SDK + verificação de idToken + emissão de JWT gestor/motorista + TenantGuard (injeta tenant_id) + refresh token | RF08 |

---

### Fase 2 — management-api: Domínios admin

Ordem forçada por dependências entre entidades. Agente alterna entre sprints desta fase e da Fase 3.

```
Tenants (RF01)
    ├── Licenças (RF02) — sincronização automática via contrato
    ├── Módulos (RF03) — validação de dependências
    └── Organizações (RF04)
            └── Contratos (RF05)
                    ├── Efeito colateral: suspende/encerra tenant (RF05.4)
                    ├── Efeito colateral: gera primeira fatura (RF05.5)
                    ├── Efeito colateral: sincroniza licença (RF05.6)
                    └── Faturas (RF06) — geração em lote
Dashboard Admin (RF07) ← agrega todos
Convites de gestor (RF20.2)
```

| Sprint | Módulo | RFs | Deploy |
|---|---|---|---|
| 2.1 | Tenants: CRUD + auditoria + restrição cidade/estado único | RF01 | ✅ |
| 2.2 | Licenças: leitura + sincronização com contrato | RF02 | ✅ |
| 2.3 | Módulos: cadastro + validação de dependências (required / exclusive_group) | RF03 | ✅ |
| 2.4 | Organizações: CRUD + vínculo 1:1 com tenant + auditoria | RF04 | ✅ |
| 2.5 | Contratos: criação + status (ativo/suspenso/encerrado) + efeitos colaterais (suspender tenant, gerar fatura, sincronizar licença) | RF05 | ✅ |
| 2.6 | Faturas: criação individual + geração em lote + marcar como paga/cancelada | RF06 | ✅ |
| 2.7 | Dashboard Admin: KPIs gerais + KPIs comerciais + uso por tenant + anomalias | RF07 | ✅ |
| 2.8 | Convites de gestor: gerar link com expiração 7 dias + reenvio + validação no aceite | RF20.2 | ✅ |

---

### Fase 3 — app-api: Cadastros base

**Paralelo com Fase 2.** Sem dependência de management-api concluída.

```
Escolas / Pontos de serviço (RF12)
        └── Alunos + responsáveis + endereços + CSV export (RF09)

Motoristas + CNH + convite (RF10, RF20.1)
Veículos + vínculo motorista + validação de licença (RF11)
```

| Sprint | Módulo | RFs | Deploy |
|---|---|---|---|
| 3.1 | Escolas: CRUD + horários por turno + contatos | RF12 | ✅ |
| 3.2 | Alunos: CRUD + responsáveis + endereços de embarque + exportação CSV | RF09 | ✅ |
| 3.3 | Motoristas: CRUD + perfil CNH + convite por link (gerar + reenviar + aceitar) + exportação CSV | RF10, RF20.1 | ✅ |
| 3.4 | Veículos: CRUD + vínculo motorista (M:N) + validação de limite de licença | RF11 | ✅ |

---

### Fase 4 — app-api: Rotas e Execução

**Requer Fase 3 concluída.**

```
Rotas + paradas + otimização Mapbox Directions API (RF13)
        └── Frequência / Attendance (RF15)
        └── Execução: prepare + start + registro de paradas (RF14.1-14.3)
                └── Execução: eventos + trava anti-esquecimento + finalização (RF14.4-14.9)
                        └── Histórico operacional com filtros e agregados (RF18)

Rastreamento GPS via Socket.io Gateway — single instance MVP (RF19)
```

| Sprint | Módulo | RFs | Deploy |
|---|---|---|---|
| 4.1 | Rotas: CRUD + paradas ordenadas + aprovação manual + integração Mapbox Directions API (otimização por distância/tempo) | RF13 | ✅ |
| 4.2 | Frequência: registro de presença por aluno/rota/data/direção + sobrescrita manual | RF15 | ✅ |
| 4.3 | Execução: preparar (candidatos de parada + attendance) + iniciar + registrar eventos por parada (embarcou, pulou, ausente) | RF14.1-14.3 | ✅ |
| 4.4 | Execução: eventos de rota (atraso, desvio, mecânico) + trava anti-esquecimento (RF14.9) + finalização + cancelamento | RF14.4-14.9 | ✅ |
| 4.5 | Histórico: consultar execuções concluídas com filtros + agregados (km, alunos, tempo) | RF18 | ✅ |
| 4.6 | Rastreamento GPS: Socket.io Gateway + salas por execução (`execution:{id}`) + broadcast posição + status em tempo real | RF19 | ✅ |

> **Nota Socket.io:** MVP roda em single instance Railway. Sem Redis Adapter. Escala horizontal futura requer adicionar Redis Adapter — registrar como decisão técnica no vault.

---

### Fase 5 — Notificações e Outbox

**Requer Fase 4 concluída.**

```
Device tokens + FCM (RF21)
Outbox Worker (@Cron no app-api, polling outbox_events a cada 5s)
        └── Push notifications via Firebase MCP / Admin SDK (RF21.2-21.4)
        └── WhatsApp Business API: embarque, desembarque, cancelamento (RF14 eventos)
```

| Sprint | Módulo | RFs | Deploy |
|---|---|---|---|
| 5.1 | Device tokens: registro + atualização de FCM token por usuário autenticado | RF21.1 | ✅ |
| 5.2 | Outbox Worker: `@Cron` no app-api, polling `outbox_events` não publicados a cada 5s, max 3 tentativas por evento, marca como publicado | Arquitetura | ✅ |
| 5.3 | Push notifications: FCM via Firebase Admin SDK — eventos `EXECUTION_STARTED`, `STUDENT_BOARDED`, `STUDENT_DELIVERED` | RF21.2-21.4 | ✅ |
| 5.4 | WhatsApp Business API: disparos de cancelamento de viagem, confirmação de embarque e confirmação de desembarque | RF14 | ✅ |

---

## 8. Sequência Visual

```
Fase 0: Setup (bloqueante) ─────────────────────────────────
Fase 1: Auth ──────────────────────────────────── (após 0.8)
                    │
      ┌─────────────┴──────────────────────────┐
      ▼  (agente alterna entre as duas)        ▼
Fase 2: management-api              Fase 3: app-api cadastros
(2.1 → 2.2 → 2.3 → 2.4 →          (3.1 → 3.2 → 3.3 → 3.4)
 2.5 → 2.6 → 2.7 → 2.8)
      └─────────────┬──────────────────────────┘
                    ▼  (requer F3 concluída)
         Fase 4: Rotas + Execução
         (4.1 → 4.2 → 4.3 → 4.4 → 4.5 → 4.6)
                    │
                    ▼
         Fase 5: Notificações + Outbox
         (5.1 → 5.2 → 5.3 → 5.4)
```

---

## 9. Referências do Vault

- Requisitos: `RouttesApp_Core/CORE/Requisitos funcionais.md`
- Modelagem: `RouttesApp_Core/CORE/Modelagem de dados.md`
- Arquitetura: `RouttesApp_Core/CORE/Arquitetura técnica.md`
- Escopo MVP: `RouttesApp_Core/CORE/Documento de Escopo do Projeto.md`
- Integrações: `RouttesApp_Core/CORE/Integrações externas.md`
