# Fase 5 — Notificações e Outbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o sistema de notificações da app-api: registro de FCM token por usuário, Outbox Worker com retry e despacho de eventos críticos de execução via push notification (FCM) e WhatsApp Business API.

**Architecture:** Quatro sprints na app-api. O `NotificationsModule` expõe um endpoint REST para o app Flutter registrar o token FCM (atualiza `users.fcm_token`). O `OutboxModule` contém um `OutboxWorker` com `@Cron('*/5 * * * * *')` que faz polling de `outbox_events` não publicados (produzidos na Fase 4 pelo `ExecutionsService`), despacha para handlers especializados por `event_type`, e implementa retry com `retry_count` e `failed_permanently` (requer migration 002 para adicionar essas colunas). O `FcmService` usa Firebase Admin SDK para push notifications individuais e registra envio na tabela `notifications`. O `WhatsAppService` usa HTTP (Axios) para chamar a Meta Cloud API com templates de mensagem para responsáveis. Nenhuma chamada FCM ou WhatsApp ocorre na thread de request — tudo é assíncrono via Outbox.

**Tech Stack:** NestJS 10, `@nestjs/schedule`, `@nestjs/axios`, `firebase-admin`, Prisma 5 (schema `app`), `class-validator`, `class-transformer`, `uuid`, Jest.

**Decisão arquitetural — FCM para STUDENT_BOARDED/DELIVERED:** O MVP usa WhatsApp (não FCM) para notificar responsáveis nos eventos de embarque e desembarque. Motivo: `student_guardians.phone` não possui FK para `users.id` — não há como recuperar o `fcm_token` do responsável sem uma query extra por número de telefone, o que é não-determinístico. FCM para responsáveis é evolução pós-MVP. A cobertura de RF21.2-21.4 via FCM se aplica apenas a gestores (`EXECUTION_STARTED`); embarque/desembarque são cobertos por WhatsApp (RF14 eventos) como especificado no vault (`Integrações externas.md` § WhatsApp Business API).

**Pré-requisito:** Fase 4 concluída — `outbox_events`, `notifications`, `users`, `student_guardians`, `execution_stops`, `route_executions` presentes no Prisma Client. `JwtAuthGuard`, `TenantGuard`, `@CurrentUser()` disponíveis.

**Spec:** `docs/superpowers/specs/2026-03-19-backend-roadmap-design.md` § Fase 5
**Vault:**
- `RouttesApp_Core/CORE/Requisitos funcionais.md` § RF21, RF14
- `RouttesApp_Core/CORE/Modelagem de dados.md` § outbox_events, notifications, users
- `RouttesApp_Core/CORE/Arquitetura técnica.md` § Outbox Pattern, Orientação a eventos
- `RouttesApp_Core/CORE/Integrações externas.md` § FCM, WhatsApp Business API
- `RouttesApp_Core/SKILLS/use-firebase/SKILL.md` § FCM send patterns, error handling

---

## Arquivos a criar / modificar

```
services/app-api/
├── db/
│   └── migrations/
│       └── 002_outbox_retry_columns.sql   ← NEW: retry_count, last_error, failed_permanently
│
├── src/
│   ├── communication/
│   │   └── notifications/
│   │       ├── notifications.module.ts     ← NEW: imports PrismaModule
│   │       ├── notifications.controller.ts ← NEW: PUT /notifications/device-token
│   │       ├── notifications.service.ts    ← NEW: updateFcmToken(userId, token)
│   │       └── dto/
│   │           └── update-device-token.dto.ts   ← NEW: { token: string }
│   │
│   ├── shared/
│   │   └── outbox/
│   │       ├── outbox.module.ts            ← NEW: ScheduleModule, FcmModule, WhatsAppModule
│   │       ├── outbox.worker.ts            ← NEW: @Cron cada 5s, retry lógica
│   │       ├── fcm/
│   │       │   ├── fcm.module.ts           ← NEW: global Firebase Admin SDK provider
│   │       │   └── fcm.service.ts          ← NEW: sendToUser, sendToMany, handleTokenError
│   │       ├── whatsapp/
│   │       │   ├── whatsapp.module.ts      ← NEW: HttpModule
│   │       │   └── whatsapp.service.ts     ← NEW: sendTemplate(phone, template, params)
│   │       └── handlers/
│   │           ├── execution-started.handler.ts  ← NEW: FCM → gestor do tenant
│   │           ├── student-boarded.handler.ts    ← NEW: WhatsApp → responsável
│   │           ├── student-delivered.handler.ts  ← NEW: WhatsApp → responsável
│   │           └── route-cancelled.handler.ts    ← NEW: WhatsApp → responsáveis ativos da rota
│   │
│   └── app.module.ts                       ← MODIFY: import NotificationsModule, OutboxModule
│
└── test/
    └── shared/
        └── outbox/
            ├── outbox.worker.spec.ts
            ├── fcm.service.spec.ts
            └── whatsapp.service.spec.ts
```

---

## Task 0: Verificação de pré-requisitos

**Files:** nenhum arquivo criado — apenas verificação.

- [ ] **0.1** Confirmar que os models necessários existem no Prisma Client:

```bash
grep -n "model outbox_events\|model notifications\|model users\|model student_guardians\|model route_executions" \
  services/app-api/src/prisma/schema.prisma
```

Expected: todos os 5 models presentes. Se não, executar `pnpm exec prisma db pull` em `services/app-api`.

- [ ] **0.2** Instalar dependências:

```bash
cd services/app-api && \
  pnpm add @nestjs/schedule && \
  pnpm add -D @types/cron
```

> `@nestjs/axios` e `firebase-admin` já estão instalados desde a Fase 1.

- [ ] **0.3** Confirmar variáveis de ambiente necessárias no Railway (production):

```bash
# Verificar que WHATSAPP_API_TOKEN e WHATSAPP_PHONE_NUMBER_ID existem
# Se não existirem, adicioná-las via Railway MCP antes de prosseguir
# (skill: railway:use-railway)
```

Variáveis obrigatórias para esta fase:
- `WHATSAPP_API_TOKEN` — Bearer token da Meta Cloud API
- `WHATSAPP_PHONE_NUMBER_ID` — ID do número de telefone do WhatsApp Business

---

## Task 1: Migration 002 — Colunas de retry no outbox_events

**Files:**
- Create: `services/app-api/db/migrations/002_outbox_retry_columns.sql`

As colunas de retry são necessárias para que o worker implemente "máximo 3 tentativas" sem estado em memória (perdido a cada deploy).

- [ ] **1.1** Escrever a migration:

```sql
-- services/app-api/db/migrations/002_outbox_retry_columns.sql
-- Migration 002: Adiciona suporte a retry no outbox_events

ALTER TABLE app.outbox_events
  ADD COLUMN IF NOT EXISTS retry_count     INTEGER   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error      TEXT,
  ADD COLUMN IF NOT EXISTS failed_permanently BOOLEAN NOT NULL DEFAULT FALSE;

-- Índice atualizado: exclui eventos com falha permanente
CREATE INDEX IF NOT EXISTS idx_outbox_events_pending
  ON app.outbox_events (published, failed_permanently, created_at)
  WHERE published = FALSE AND failed_permanently = FALSE;

COMMENT ON COLUMN app.outbox_events.retry_count IS 'Número de tentativas de processamento realizadas';
COMMENT ON COLUMN app.outbox_events.last_error IS 'Último erro de processamento (para debug)';
COMMENT ON COLUMN app.outbox_events.failed_permanently IS 'TRUE quando retry_count >= 3 e todas falharam';
```

- [ ] **1.2** Aplicar migration via Neon MCP — fluxo seguro (skill: use-neon):

```
1. Criar branch Neon de teste: "migration-002-outbox-retry"
2. Aplicar SQL na branch de teste
3. Verificar com mcp__neon__compare_database_schema
4. Aplicar em production (branch: production)
5. Deletar branch de teste
```

- [ ] **1.3** Regenerar Prisma Client após migration:

```bash
cd services/app-api && pnpm exec prisma db pull && pnpm exec prisma generate
```

- [ ] **1.4** Confirmar que `outbox_events` tem os novos campos no schema gerado:

```bash
grep -A 5 "outbox_events" services/app-api/src/prisma/schema.prisma | grep -E "retry_count|last_error|failed_permanently"
```

Expected: 3 linhas com os novos campos.

- [ ] **1.5** Commit:

```bash
git add services/app-api/db/migrations/002_outbox_retry_columns.sql \
        services/app-api/src/prisma/schema.prisma
git commit -m "chore(app-api): migration 002 — outbox retry columns"
```

---

## Task 2: Device Token Module (Sprint 5.1 — RF21.1)

**Files:**
- Create: `services/app-api/src/communication/notifications/notifications.module.ts`
- Create: `services/app-api/src/communication/notifications/notifications.controller.ts`
- Create: `services/app-api/src/communication/notifications/notifications.service.ts`
- Create: `services/app-api/src/communication/notifications/dto/update-device-token.dto.ts`

O endpoint `PUT /notifications/device-token` atualiza o campo `fcm_token` na tabela `users` para o usuário autenticado. Não há tabela separada — o campo já existe no modelo conforme a Modelagem de dados.

- [ ] **2.1** Escrever o teste:

```typescript
// services/app-api/test/communication/notifications.service.spec.ts
import { Test } from '@nestjs/testing';
import { NotificationsService } from '../../src/communication/notifications/notifications.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: { users: { update: jest.fn() } },
        },
      ],
    }).compile();

    service = module.get(NotificationsService);
    prisma = module.get(PrismaService);
  });

  it('should update fcm_token for the authenticated user', async () => {
    const userId = 'user-uuid-123';
    const token = 'fcm-token-abc';
    prisma.users.update.mockResolvedValue({ id: userId, fcm_token: token } as any);

    await service.updateFcmToken(userId, token);

    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { fcm_token: token },
    });
  });
});
```

- [ ] **2.2** Rodar o teste para confirmar que falha:

```bash
cd services/app-api && pnpm test --testPathPattern="notifications.service.spec"
```

Expected: FAIL — `NotificationsService` não existe.

- [ ] **2.3** Criar o DTO:

```typescript
// services/app-api/src/communication/notifications/dto/update-device-token.dto.ts
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdateDeviceTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  token: string;
}
```

- [ ] **2.4** Criar o service:

```typescript
// services/app-api/src/communication/notifications/notifications.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async updateFcmToken(userId: string, token: string): Promise<void> {
    await this.prisma.users.update({
      where: { id: userId },
      data: { fcm_token: token },
    });
  }
}
```

- [ ] **2.5** Criar o controller:

```typescript
// services/app-api/src/communication/notifications/notifications.controller.ts
import { Controller, Put, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { UpdateDeviceTokenDto } from './dto/update-device-token.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  // PUT /notifications/device-token
  // Body: { token: string }
  // Atualiza o FCM token do usuário autenticado
  @Put('device-token')
  async updateDeviceToken(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateDeviceTokenDto,
  ): Promise<{ message: string }> {
    await this.service.updateFcmToken(userId, dto.token);
    return { message: 'Token atualizado com sucesso' };
  }
}
```

- [ ] **2.6** Criar o module:

```typescript
// services/app-api/src/communication/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [PrismaModule],   // PrismaModule exporta PrismaService para injeção
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
```

- [ ] **2.7** Rodar o teste para confirmar que passa:

```bash
cd services/app-api && pnpm test --testPathPattern="notifications.service.spec"
```

Expected: PASS.

- [ ] **2.8** Commit:

```bash
git add services/app-api/src/communication/notifications/ \
        services/app-api/test/communication/notifications.service.spec.ts
git commit -m "feat(app-api): device token endpoint — PUT /notifications/device-token (RF21.1)"
```

---

## Task 3: FCM Service

**Files:**
- Create: `services/app-api/src/shared/outbox/fcm/fcm.module.ts`
- Create: `services/app-api/src/shared/outbox/fcm/fcm.service.ts`
- Test: `services/app-api/test/shared/outbox/fcm.service.spec.ts`

O `FcmService` encapsula toda interação com Firebase Admin SDK. Registra envios na tabela `notifications`. Limpa tokens expirados.

- [ ] **3.1** Escrever o teste:

```typescript
// services/app-api/test/shared/outbox/fcm.service.spec.ts
import { Test } from '@nestjs/testing';
import { FcmService } from '../../../src/shared/outbox/fcm/fcm.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import * as admin from 'firebase-admin';

jest.mock('firebase-admin', () => ({
  messaging: jest.fn().mockReturnValue({
    send: jest.fn(),
  }),
}));

describe('FcmService', () => {
  let service: FcmService;
  let prisma: jest.Mocked<PrismaService>;
  let mockSend: jest.Mock;

  beforeEach(async () => {
    mockSend = (admin.messaging() as any).send;
    mockSend.mockReset();

    const module = await Test.createTestingModule({
      providers: [
        FcmService,
        {
          provide: PrismaService,
          useValue: {
            users: { update: jest.fn() },
            notifications: { create: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get(FcmService);
    prisma = module.get(PrismaService);
  });

  it('should send FCM and record notification', async () => {
    mockSend.mockResolvedValue('message-id-123');
    (prisma.notifications.create as jest.Mock).mockResolvedValue({});

    await service.sendToUser({
      userId: 'user-1',
      tenantId: 'tenant-1',
      fcmToken: 'token-xyz',
      title: 'Rota iniciada',
      body: 'Sua rota foi iniciada pelo motorista',
      data: { type: 'EXECUTION_STARTED', executionId: 'exec-1' },
    });

    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      token: 'token-xyz',
      notification: { title: 'Rota iniciada', body: 'Sua rota foi iniciada pelo motorista' },
    }));
    expect(prisma.notifications.create).toHaveBeenCalled();
  });

  it('should clear expired token and not throw or record notification', async () => {
    const error = Object.assign(new Error('not registered'), {
      code: 'messaging/registration-token-not-registered',
    });
    mockSend.mockRejectedValue(error);
    (prisma.users.update as jest.Mock).mockResolvedValue({});

    // Should not throw — just cleans up token. NOT recording notification (no successful send).
    await expect(
      service.sendToUser({
        userId: 'user-1',
        tenantId: 'tenant-1',
        fcmToken: 'expired-token',
        title: 'Test',
        body: 'Test',
        data: {},
      }),
    ).resolves.not.toThrow();

    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { fcm_token: null },
    });
    // Notification NOT recorded — no successful delivery
    expect(prisma.notifications.create).not.toHaveBeenCalled();
  });

  it('should re-throw on transient FCM errors so outbox worker can retry', async () => {
    const error = Object.assign(new Error('quota-exceeded'), {
      code: 'messaging/quota-exceeded',
    });
    mockSend.mockRejectedValue(error);

    await expect(
      service.sendToUser({
        userId: 'user-1',
        tenantId: 'tenant-1',
        fcmToken: 'valid-token',
        title: 'Test',
        body: 'Test',
        data: {},
      }),
    ).rejects.toThrow('quota-exceeded');

    // Neither token cleanup nor notification record on transient errors
    expect(prisma.users.update).not.toHaveBeenCalled();
    expect(prisma.notifications.create).not.toHaveBeenCalled();
  });
});
```

- [ ] **3.2** Rodar para confirmar falha:

```bash
cd services/app-api && pnpm test --testPathPattern="fcm.service.spec"
```

Expected: FAIL — `FcmService` não existe.

- [ ] **3.3** Criar o service:

```typescript
// services/app-api/src/shared/outbox/fcm/fcm.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '../../../prisma/prisma.service';

export interface FcmSendParams {
  userId: string;
  tenantId: string;
  fcmToken: string;
  title: string;
  body: string;
  data: Record<string, string>;
}

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sendToUser(params: FcmSendParams): Promise<void> {
    const { userId, tenantId, fcmToken, title, body, data } = params;

    try {
      const fcmMessageId = await admin.messaging().send({
        token: fcmToken,
        notification: { title, body },
        data,
        android: { priority: 'high' },
      });

      // Registrar SOMENTE em caso de sucesso — audit trail confiável (RF21.4)
      await this.prisma.notifications.create({
        data: {
          tenant_id: tenantId,
          user_id: userId,
          type: data.type ?? 'unknown',
          payload: data as any,
          sent_at: new Date(),
          fcm_message_id: fcmMessageId,
        },
      });
    } catch (err: any) {
      const isExpiredToken =
        err?.code === 'messaging/registration-token-not-registered' ||
        err?.code === 'messaging/invalid-registration-token';

      if (isExpiredToken) {
        // Token inválido → limpar silenciosamente, sem retry (não relança)
        await this.prisma.users.update({
          where: { id: userId },
          data: { fcm_token: null },
        });
        this.logger.log(`FCM token cleared for user ${userId} (expired/invalid)`);
        return;
      }

      // Erros transientes (rate limit, network, Firebase 500) → relançar
      // para que o OutboxWorker incremente retry_count e tente novamente
      this.logger.warn(`FCM send failed for user ${userId}: ${err?.message}`);
      throw err;
    }
  }
}
```

- [ ] **3.4** Criar o module:

```typescript
// services/app-api/src/shared/outbox/fcm/fcm.module.ts
import { Module } from '@nestjs/common';
import { FcmService } from './fcm.service';

@Module({
  providers: [FcmService],
  exports: [FcmService],
})
export class FcmModule {}
```

- [ ] **3.5** Rodar os testes:

```bash
cd services/app-api && pnpm test --testPathPattern="fcm.service.spec"
```

Expected: PASS.

- [ ] **3.6** Commit:

```bash
git add services/app-api/src/shared/outbox/fcm/ \
        services/app-api/test/shared/outbox/fcm.service.spec.ts
git commit -m "feat(app-api): FCM service — send push + token cleanup + notification record"
```

---

## Task 4: WhatsApp Service (Sprint 5.4)

**Files:**
- Create: `services/app-api/src/shared/outbox/whatsapp/whatsapp.module.ts`
- Create: `services/app-api/src/shared/outbox/whatsapp/whatsapp.service.ts`
- Test: `services/app-api/test/shared/outbox/whatsapp.service.spec.ts`

A Meta Cloud API usa templates pré-aprovados. O payload segue o formato JSON da API `v18.0`. O número de telefone do responsável vem de `student_guardians.phone`.

- [ ] **4.1** Escrever o teste:

```typescript
// services/app-api/test/shared/outbox/whatsapp.service.spec.ts
import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { WhatsAppService } from '../../../src/shared/outbox/whatsapp/whatsapp.service';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('WhatsAppService', () => {
  let service: WhatsAppService;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WhatsAppService,
        {
          provide: HttpService,
          useValue: { post: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const map: Record<string, string> = {
                WHATSAPP_API_TOKEN: 'test-token',
                WHATSAPP_PHONE_NUMBER_ID: '123456789',
              };
              return map[key];
            },
          },
        },
      ],
    }).compile();

    service = module.get(WhatsAppService);
    httpService = module.get(HttpService);
  });

  it('should POST to Meta Cloud API with correct payload', async () => {
    const mockResponse: AxiosResponse = {
      data: { messages: [{ id: 'wamid.abc' }] },
      status: 200,
    } as any;
    (httpService.post as jest.Mock).mockReturnValue(of(mockResponse));

    await service.sendTemplate({
      phone: '5511999998888',
      templateName: 'embarque_confirmado',
      languageCode: 'pt_BR',
      components: [{ type: 'body', parameters: [{ type: 'text', text: 'João' }] }],
    });

    expect(httpService.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v18.0/123456789/messages',
      expect.objectContaining({
        messaging_product: 'whatsapp',
        to: '5511999998888',
        type: 'template',
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    );
  });

  it('should not throw on WhatsApp API error — log and continue', async () => {
    (httpService.post as jest.Mock).mockReturnValue(
      throwError(() => new Error('Network error')),
    );

    await expect(
      service.sendTemplate({
        phone: '5511999998888',
        templateName: 'cancelamento_viagem',
        languageCode: 'pt_BR',
        components: [],
      }),
    ).resolves.not.toThrow();
  });
});
```

- [ ] **4.2** Rodar para confirmar falha:

```bash
cd services/app-api && pnpm test --testPathPattern="whatsapp.service.spec"
```

Expected: FAIL — `WhatsAppService` não existe.

- [ ] **4.3** Criar o service:

```typescript
// services/app-api/src/shared/outbox/whatsapp/whatsapp.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface WhatsAppTemplateParams {
  phone: string;                  // Formato E.164 sem '+': ex: "5511999998888"
  templateName: string;           // Nome do template aprovado no Meta
  languageCode: string;           // ex: "pt_BR"
  components: WhatsAppComponent[];
}

export interface WhatsAppComponent {
  type: 'header' | 'body' | 'button';
  parameters: Array<{ type: 'text'; text: string }>;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiToken: string;
  private readonly phoneNumberId: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    this.apiToken = this.config.get<string>('WHATSAPP_API_TOKEN')!;
    this.phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID')!;
  }

  async sendTemplate(params: WhatsAppTemplateParams): Promise<void> {
    const { phone, templateName, languageCode, components } = params;
    const url = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    };

    try {
      await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );
      this.logger.log(`WhatsApp sent template "${templateName}" to ${phone}`);
    } catch (err: any) {
      // Não lança exceção — falha de WhatsApp não deve travar o Outbox Worker
      this.logger.error(
        `WhatsApp send failed for ${phone}: ${err?.message ?? String(err)}`,
      );
    }
  }
}
```

- [ ] **4.4** Criar o module:

```typescript
// services/app-api/src/shared/outbox/whatsapp/whatsapp.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WhatsAppService } from './whatsapp.service';

@Module({
  imports: [HttpModule],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
```

- [ ] **4.5** Rodar os testes:

```bash
cd services/app-api && pnpm test --testPathPattern="whatsapp.service.spec"
```

Expected: PASS.

- [ ] **4.6** Commit:

```bash
git add services/app-api/src/shared/outbox/whatsapp/ \
        services/app-api/test/shared/outbox/whatsapp.service.spec.ts
git commit -m "feat(app-api): WhatsApp service — Meta Cloud API template dispatch"
```

---

## Task 5: Outbox Handlers (Sprints 5.3 + 5.4)

**Files:**
- Create: `services/app-api/src/shared/outbox/handlers/execution-started.handler.ts`
- Create: `services/app-api/src/shared/outbox/handlers/student-boarded.handler.ts`
- Create: `services/app-api/src/shared/outbox/handlers/student-delivered.handler.ts`
- Create: `services/app-api/src/shared/outbox/handlers/route-cancelled.handler.ts`

Cada handler recebe o `payload` do `outbox_events` e dispara os efeitos colaterais (FCM e/ou WhatsApp). Handlers são classes `Injectable` para facilitar testes e injeção de dependência.

O `payload` de cada evento (produzido na Fase 4) contém os dados necessários. Estrutura esperada por evento:

```
EXECUTION_STARTED:  { executionId, routeId, tenantId, driverName, routeName }
STUDENT_BOARDED:    { executionId, studentId, studentName, guardianPhone, guardianName, tenantId, boardedAt }
STUDENT_DELIVERED:  { executionId, studentId, studentName, guardianPhone, guardianName, tenantId, deliveredAt }
ROUTE_CANCELLED:    { executionId, routeId, tenantId, routeName, guardianPhones: string[] }
```

- [ ] **5.1** Escrever os testes dos handlers antes de implementá-los:

```typescript
// services/app-api/test/shared/outbox/handlers.spec.ts
import { Test } from '@nestjs/testing';
import { ExecutionStartedHandler } from '../../../src/shared/outbox/handlers/execution-started.handler';
import { StudentBoardedHandler } from '../../../src/shared/outbox/handlers/student-boarded.handler';
import { RouteCancelledHandler } from '../../../src/shared/outbox/handlers/route-cancelled.handler';
import { FcmService } from '../../../src/shared/outbox/fcm/fcm.service';
import { WhatsAppService } from '../../../src/shared/outbox/whatsapp/whatsapp.service';
import { PrismaService } from '../../../src/prisma/prisma.service';

describe('ExecutionStartedHandler', () => {
  let handler: ExecutionStartedHandler;
  let prisma: jest.Mocked<PrismaService>;
  let fcm: jest.Mocked<FcmService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ExecutionStartedHandler,
        { provide: PrismaService, useValue: { users: { findMany: jest.fn() } } },
        { provide: FcmService, useValue: { sendToUser: jest.fn() } },
      ],
    }).compile();
    handler = module.get(ExecutionStartedHandler);
    prisma = module.get(PrismaService);
    fcm = module.get(FcmService);
  });

  it('should send FCM to all active managers with fcm_token', async () => {
    (prisma.users.findMany as jest.Mock).mockResolvedValue([
      { id: 'mgr-1', fcm_token: 'tok-1' },
      { id: 'mgr-2', fcm_token: 'tok-2' },
    ]);
    (fcm.sendToUser as jest.Mock).mockResolvedValue(undefined);

    await handler.handle({ executionId: 'e1', tenantId: 't1', routeName: 'Rota A' });

    expect(fcm.sendToUser).toHaveBeenCalledTimes(2);
    expect(fcm.sendToUser).toHaveBeenCalledWith(expect.objectContaining({ fcmToken: 'tok-1' }));
  });

  it('should not fail when no managers have fcm_token', async () => {
    (prisma.users.findMany as jest.Mock).mockResolvedValue([]);
    await expect(handler.handle({ executionId: 'e1', tenantId: 't1', routeName: 'R' }))
      .resolves.not.toThrow();
    expect(fcm.sendToUser).not.toHaveBeenCalled();
  });
});

describe('StudentBoardedHandler', () => {
  let handler: StudentBoardedHandler;
  let whatsapp: jest.Mocked<WhatsAppService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        StudentBoardedHandler,
        { provide: WhatsAppService, useValue: { sendTemplate: jest.fn() } },
      ],
    }).compile();
    handler = module.get(StudentBoardedHandler);
    whatsapp = module.get(WhatsAppService);
  });

  it('should send WhatsApp template with boarding details', async () => {
    (whatsapp.sendTemplate as jest.Mock).mockResolvedValue(undefined);
    await handler.handle({
      studentName: 'João',
      guardianPhone: '5511999998888',
      guardianName: 'Maria',
      boardedAt: new Date().toISOString(),
    });
    expect(whatsapp.sendTemplate).toHaveBeenCalledWith(expect.objectContaining({
      phone: '5511999998888',
      templateName: 'embarque_confirmado',
    }));
  });

  it('should skip send when guardianPhone is absent', async () => {
    await handler.handle({ studentName: 'João', guardianPhone: null, boardedAt: '' });
    expect(whatsapp.sendTemplate).not.toHaveBeenCalled();
  });
});

describe('RouteCancelledHandler', () => {
  let handler: RouteCancelledHandler;
  let whatsapp: jest.Mocked<WhatsAppService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RouteCancelledHandler,
        { provide: WhatsAppService, useValue: { sendTemplate: jest.fn() } },
      ],
    }).compile();
    handler = module.get(RouteCancelledHandler);
    whatsapp = module.get(WhatsAppService);
  });

  it('should notify all guardian phones on cancellation', async () => {
    (whatsapp.sendTemplate as jest.Mock).mockResolvedValue(undefined);
    await handler.handle({
      routeName: 'Rota B',
      guardianPhones: ['5511111111111', '5522222222222'],
    });
    expect(whatsapp.sendTemplate).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **5.1b** Rodar para confirmar falha:

```bash
cd services/app-api && pnpm test --testPathPattern="handlers.spec"
```

Expected: FAIL — handlers não existem.

- [ ] **5.2** Criar o handler `EXECUTION_STARTED`:

```typescript
// services/app-api/src/shared/outbox/handlers/execution-started.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { FcmService } from '../fcm/fcm.service';

@Injectable()
export class ExecutionStartedHandler {
  private readonly logger = new Logger(ExecutionStartedHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fcm: FcmService,
  ) {}

  async handle(payload: Record<string, any>): Promise<void> {
    const { executionId, tenantId, routeName } = payload;

    // Buscar gestores do tenant com FCM token cadastrado
    const managers = await this.prisma.users.findMany({
      where: {
        tenant_id: tenantId,
        role: 'manager',
        status: 'active',
        fcm_token: { not: null },
      },
      select: { id: true, fcm_token: true },
    });

    this.logger.log(
      `EXECUTION_STARTED: notifying ${managers.length} managers for execution ${executionId}`,
    );

    await Promise.allSettled(
      managers.map((m) =>
        this.fcm.sendToUser({
          userId: m.id,
          tenantId,
          fcmToken: m.fcm_token!,
          title: 'Rota iniciada',
          body: `A rota "${routeName}" foi iniciada`,
          data: { type: 'EXECUTION_STARTED', executionId },
        }),
      ),
    );
  }
}
```

- [ ] **5.2** Criar o handler `STUDENT_BOARDED`:

```typescript
// services/app-api/src/shared/outbox/handlers/student-boarded.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class StudentBoardedHandler {
  private readonly logger = new Logger(StudentBoardedHandler.name);

  constructor(private readonly whatsapp: WhatsAppService) {}

  async handle(payload: Record<string, any>): Promise<void> {
    const { studentName, guardianPhone, guardianName, boardedAt } = payload;

    if (!guardianPhone) {
      this.logger.warn(`STUDENT_BOARDED: no guardian phone for student "${studentName}"`);
      return;
    }

    const time = new Date(boardedAt).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });

    await this.whatsapp.sendTemplate({
      phone: guardianPhone,
      templateName: 'embarque_confirmado',
      languageCode: 'pt_BR',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: guardianName ?? 'Responsável' },
            { type: 'text', text: studentName },
            { type: 'text', text: time },
          ],
        },
      ],
    });
  }
}
```

- [ ] **5.3** Criar o handler `STUDENT_DELIVERED`:

```typescript
// services/app-api/src/shared/outbox/handlers/student-delivered.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class StudentDeliveredHandler {
  private readonly logger = new Logger(StudentDeliveredHandler.name);

  constructor(private readonly whatsapp: WhatsAppService) {}

  async handle(payload: Record<string, any>): Promise<void> {
    const { studentName, guardianPhone, guardianName, deliveredAt } = payload;

    if (!guardianPhone) {
      this.logger.warn(`STUDENT_DELIVERED: no guardian phone for student "${studentName}"`);
      return;
    }

    const time = new Date(deliveredAt).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });

    await this.whatsapp.sendTemplate({
      phone: guardianPhone,
      templateName: 'desembarque_confirmado',
      languageCode: 'pt_BR',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: guardianName ?? 'Responsável' },
            { type: 'text', text: studentName },
            { type: 'text', text: time },
          ],
        },
      ],
    });
  }
}
```

- [ ] **5.4** Criar o handler `ROUTE_CANCELLED`:

```typescript
// services/app-api/src/shared/outbox/handlers/route-cancelled.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class RouteCancelledHandler {
  private readonly logger = new Logger(RouteCancelledHandler.name);

  constructor(private readonly whatsapp: WhatsAppService) {}

  async handle(payload: Record<string, any>): Promise<void> {
    const { routeName, guardianPhones } = payload as {
      routeName: string;
      guardianPhones: string[];
    };

    if (!guardianPhones?.length) {
      this.logger.warn(`ROUTE_CANCELLED: no guardian phones to notify for route "${routeName}"`);
      return;
    }

    this.logger.log(
      `ROUTE_CANCELLED: notifying ${guardianPhones.length} guardians for route "${routeName}"`,
    );

    await Promise.allSettled(
      guardianPhones.map((phone) =>
        this.whatsapp.sendTemplate({
          phone,
          templateName: 'cancelamento_viagem',
          languageCode: 'pt_BR',
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: routeName }],
            },
          ],
        }),
      ),
    );
  }
}
```

- [ ] **5.5** Rodar os testes dos handlers para confirmar que passam:

```bash
cd services/app-api && pnpm test --testPathPattern="handlers.spec"
```

Expected: PASS — todos os 5 casos de teste.

- [ ] **5.6** Commit:

```bash
git add services/app-api/src/shared/outbox/handlers/ \
        services/app-api/test/shared/outbox/handlers.spec.ts
git commit -m "feat(app-api): outbox handlers — FCM EXECUTION_STARTED + WhatsApp BOARDED/DELIVERED/CANCELLED (RF21.2-21.4, RF14)"
```

---

## Task 6: Outbox Worker (Sprint 5.2)

**Files:**
- Create: `services/app-api/src/shared/outbox/outbox.worker.ts`
- Test: `services/app-api/test/shared/outbox/outbox.worker.spec.ts`

O worker é o coração da Fase 5. Usa `@Cron('*/5 * * * * *')` do `@nestjs/schedule` para polling a cada 5 segundos. Processa eventos em lote (LIMIT 50), atualiza retry_count em caso de falha, e marca `failed_permanently = true` após 3 tentativas.

- [ ] **6.1** Escrever o teste:

```typescript
// services/app-api/test/shared/outbox/outbox.worker.spec.ts
import { Test } from '@nestjs/testing';
import { OutboxWorker } from '../../../src/shared/outbox/outbox.worker';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { ExecutionStartedHandler } from '../../../src/shared/outbox/handlers/execution-started.handler';
import { StudentBoardedHandler } from '../../../src/shared/outbox/handlers/student-boarded.handler';
import { StudentDeliveredHandler } from '../../../src/shared/outbox/handlers/student-delivered.handler';
import { RouteCancelledHandler } from '../../../src/shared/outbox/handlers/route-cancelled.handler';

describe('OutboxWorker', () => {
  let worker: OutboxWorker;
  let prisma: jest.Mocked<PrismaService>;
  let executionStartedHandler: jest.Mocked<ExecutionStartedHandler>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OutboxWorker,
        {
          provide: PrismaService,
          useValue: {
            outbox_events: {
              findMany: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        { provide: ExecutionStartedHandler, useValue: { handle: jest.fn() } },
        { provide: StudentBoardedHandler, useValue: { handle: jest.fn() } },
        { provide: StudentDeliveredHandler, useValue: { handle: jest.fn() } },
        { provide: RouteCancelledHandler, useValue: { handle: jest.fn() } },
      ],
    }).compile();

    worker = module.get(OutboxWorker);
    prisma = module.get(PrismaService);
    executionStartedHandler = module.get(ExecutionStartedHandler);
  });

  it('should process pending events and mark as published', async () => {
    const event = {
      id: 'evt-1',
      event_type: 'EXECUTION_STARTED',
      payload: { tenantId: 't1', routeName: 'Rota A' },
      retry_count: 0,
    };
    (prisma.outbox_events.findMany as jest.Mock).mockResolvedValue([event]);
    (prisma.outbox_events.update as jest.Mock).mockResolvedValue({});
    (executionStartedHandler.handle as jest.Mock).mockResolvedValue(undefined);

    await worker.processOutboxEvents();

    expect(executionStartedHandler.handle).toHaveBeenCalledWith(event.payload);
    expect(prisma.outbox_events.update).toHaveBeenCalledWith({
      where: { id: 'evt-1' },
      data: { published: true },
    });
  });

  it('should increment retry_count on failure', async () => {
    const event = {
      id: 'evt-2',
      event_type: 'EXECUTION_STARTED',
      payload: {},
      retry_count: 0,
    };
    (prisma.outbox_events.findMany as jest.Mock).mockResolvedValue([event]);
    (prisma.outbox_events.update as jest.Mock).mockResolvedValue({});
    (executionStartedHandler.handle as jest.Mock).mockRejectedValue(new Error('FCM down'));

    await worker.processOutboxEvents();

    expect(prisma.outbox_events.update).toHaveBeenCalledWith({
      where: { id: 'evt-2' },
      data: expect.objectContaining({ retry_count: 1, last_error: 'FCM down' }),
    });
  });

  it('should mark failed_permanently after 3 failed attempts', async () => {
    const event = {
      id: 'evt-3',
      event_type: 'EXECUTION_STARTED',
      payload: {},
      retry_count: 2, // já tentou 2x, esta será a 3ª
    };
    (prisma.outbox_events.findMany as jest.Mock).mockResolvedValue([event]);
    (prisma.outbox_events.update as jest.Mock).mockResolvedValue({});
    (executionStartedHandler.handle as jest.Mock).mockRejectedValue(new Error('Persistent error'));

    await worker.processOutboxEvents();

    expect(prisma.outbox_events.update).toHaveBeenCalledWith({
      where: { id: 'evt-3' },
      data: expect.objectContaining({
        retry_count: 3,
        failed_permanently: true,
        last_error: 'Persistent error',
      }),
    });
  });
});
```

- [ ] **6.2** Rodar para confirmar falha:

```bash
cd services/app-api && pnpm test --testPathPattern="outbox.worker.spec"
```

Expected: FAIL — `OutboxWorker` não existe.

- [ ] **6.3** Criar o worker:

```typescript
// services/app-api/src/shared/outbox/outbox.worker.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { ExecutionStartedHandler } from './handlers/execution-started.handler';
import { StudentBoardedHandler } from './handlers/student-boarded.handler';
import { StudentDeliveredHandler } from './handlers/student-delivered.handler';
import { RouteCancelledHandler } from './handlers/route-cancelled.handler';

const MAX_RETRIES = 3;

type OutboxHandler = { handle(payload: Record<string, any>): Promise<void> };

@Injectable()
export class OutboxWorker {
  private readonly logger = new Logger(OutboxWorker.name);
  private readonly handlers: Record<string, OutboxHandler>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly executionStartedHandler: ExecutionStartedHandler,
    private readonly studentBoardedHandler: StudentBoardedHandler,
    private readonly studentDeliveredHandler: StudentDeliveredHandler,
    private readonly routeCancelledHandler: RouteCancelledHandler,
  ) {
    this.handlers = {
      EXECUTION_STARTED: this.executionStartedHandler,
      STUDENT_BOARDED: this.studentBoardedHandler,
      STUDENT_DELIVERED: this.studentDeliveredHandler,
      ROUTE_CANCELLED: this.routeCancelledHandler,
    };
  }

  @Cron('*/5 * * * * *') // A cada 5 segundos
  async processOutboxEvents(): Promise<void> {
    // Edge case: se o UPDATE que marca failed_permanently=true falhar (ex: DB blip),
    // o evento re-entrará na fila no próximo poll com retry_count ainda < 3.
    // Isso é aceitável para MVP — o pior cenário é 1 tentativa extra além do limite.
    // O índice idx_outbox_events_pending já exclui failed_permanently=true.
    const events = await this.prisma.outbox_events.findMany({
      where: { published: false, failed_permanently: false },
      orderBy: { created_at: 'asc' },
      take: 50,
    });

    if (events.length === 0) return;

    this.logger.debug(`Processing ${events.length} outbox events`);

    for (const event of events) {
      const handler = this.handlers[event.event_type];

      if (!handler) {
        this.logger.warn(`No handler for event_type: ${event.event_type} (id: ${event.id})`);
        await this.prisma.outbox_events.update({
          where: { id: event.id },
          data: {
            failed_permanently: true,
            last_error: `No handler registered for event_type "${event.event_type}"`,
          },
        });
        continue;
      }

      try {
        await handler.handle(event.payload as Record<string, any>);
        await this.prisma.outbox_events.update({
          where: { id: event.id },
          data: { published: true },
        });
      } catch (err: any) {
        const newRetryCount = (event.retry_count ?? 0) + 1;
        const errorMessage = err?.message ?? String(err);
        const failedPermanently = newRetryCount >= MAX_RETRIES;

        this.logger.error(
          `Outbox event ${event.id} (${event.event_type}) failed (attempt ${newRetryCount}/${MAX_RETRIES}): ${errorMessage}`,
        );

        await this.prisma.outbox_events.update({
          where: { id: event.id },
          data: {
            retry_count: newRetryCount,
            last_error: errorMessage,
            ...(failedPermanently && { failed_permanently: true }),
          },
        });
      }
    }
  }
}
```

- [ ] **6.4** Rodar os testes:

```bash
cd services/app-api && pnpm test --testPathPattern="outbox.worker.spec"
```

Expected: PASS — todos os 3 casos.

- [ ] **6.5** Commit:

```bash
git add services/app-api/src/shared/outbox/outbox.worker.ts \
        services/app-api/test/shared/outbox/outbox.worker.spec.ts
git commit -m "feat(app-api): outbox worker — @Cron 5s polling + retry max 3 + failed_permanently (Sprint 5.2)"
```

---

## Task 7: Outbox Module + App Module (Wire-up)

**Files:**
- Create: `services/app-api/src/shared/outbox/outbox.module.ts`
- Modify: `services/app-api/src/app.module.ts`

- [ ] **7.1** Criar o `OutboxModule`:

```typescript
// services/app-api/src/shared/outbox/outbox.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OutboxWorker } from './outbox.worker';
import { FcmModule } from './fcm/fcm.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { ExecutionStartedHandler } from './handlers/execution-started.handler';
import { StudentBoardedHandler } from './handlers/student-boarded.handler';
import { StudentDeliveredHandler } from './handlers/student-delivered.handler';
import { RouteCancelledHandler } from './handlers/route-cancelled.handler';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    FcmModule,
    WhatsAppModule,
  ],
  providers: [
    OutboxWorker,
    ExecutionStartedHandler,
    StudentBoardedHandler,
    StudentDeliveredHandler,
    RouteCancelledHandler,
  ],
})
export class OutboxModule {}
```

- [ ] **7.2** Registrar `NotificationsModule` e `OutboxModule` no `AppModule`.

Abrir `services/app-api/src/app.module.ts` e adicionar ao array `imports`:

```typescript
import { NotificationsModule } from './communication/notifications/notifications.module';
import { OutboxModule } from './shared/outbox/outbox.module';

// No array imports do @Module:
NotificationsModule,
OutboxModule,
```

- [ ] **7.3** Rodar todos os testes da suite:

```bash
cd services/app-api && pnpm test
```

Expected: todos os testes passando. Se houver falha de compilação, corrigir antes de avançar.

- [ ] **7.4** Build de produção para garantir compilação sem erros:

```bash
cd services/app-api && pnpm build
```

Expected: saída sem erros. Diretório `dist/` gerado.

- [ ] **7.5** Commit:

```bash
git add services/app-api/src/shared/outbox/outbox.module.ts \
        services/app-api/src/app.module.ts
git commit -m "feat(app-api): wire OutboxModule + NotificationsModule into AppModule"
```

---

## Task 8: PR, Deploy e Validação

**Files:** nenhum novo arquivo — apenas integração e validação.

- [ ] **8.1** Criar PR via GitHub MCP (skill: use-github):

```
Branch: feat/fase5-notificacoes-outbox
Base: main
Título: feat(app-api): Fase 5 — Notificações FCM + Outbox Worker + WhatsApp (RF21)
```

Descrição deve incluir:
- Sprint 5.1: device token endpoint
- Sprint 5.2: outbox worker com retry
- Sprint 5.3: FCM — EXECUTION_STARTED, STUDENT_BOARDED, STUDENT_DELIVERED
- Sprint 5.4: WhatsApp — embarque, desembarque, cancelamento
- Migration 002: retry columns no outbox_events

- [ ] **8.2** Fazer merge do PR após revisão.

- [ ] **8.3** Deploy via Railway MCP (skill: railway:use-railway):

```
Serviço: app-api
Ambiente: production
Trigger: merge em main (automático via Railway)
```

Aguardar build completar e confirmar status `ACTIVE`.

- [ ] **8.4** Verificar que o health check continua respondendo:

```
GET https://<app-api-production-url>/health
Expected: 200 OK
```

- [ ] **8.5** Confirmar nos logs do Railway que o Outbox Worker iniciou sem erros:

```
Expected log: "[OutboxWorker] Processing 0 outbox events" (ou similar)
```

O cron executa a cada 5s — dentro de 10s após o deploy você deve ver pelo menos uma linha de log do worker.

- [ ] **8.6** Smoke test manual do endpoint de device token:

```bash
# Usar um JWT válido de gestor/motorista obtido via POST /auth/login
curl -X PUT https://<app-api-production-url>/notifications/device-token \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"token": "fcm-test-token-fase5"}'

# Expected: 200 OK { "message": "Token atualizado com sucesso" }
```

---

## Resumo de eventos suportados pelo Outbox Worker

| `event_type` | Handler | Canal | Destinatário |
|---|---|---|---|
| `EXECUTION_STARTED` | `ExecutionStartedHandler` | FCM push | Gestores do tenant com FCM token |
| `STUDENT_BOARDED` | `StudentBoardedHandler` | WhatsApp | Responsável (`guardian.phone`) |
| `STUDENT_DELIVERED` | `StudentDeliveredHandler` | WhatsApp | Responsável (`guardian.phone`) |
| `ROUTE_CANCELLED` | `RouteCancelledHandler` | WhatsApp | Lista de responsáveis da rota |

> Eventos não mapeados são marcados como `failed_permanently = true` imediatamente, sem retry.

## Templates WhatsApp requeridos (pré-aprovação Meta)

| Template | Variáveis | Evento |
|---|---|---|
| `embarque_confirmado` | `{{responsável}}`, `{{aluno}}`, `{{horário}}` | `STUDENT_BOARDED` |
| `desembarque_confirmado` | `{{responsável}}`, `{{aluno}}`, `{{horário}}` | `STUDENT_DELIVERED` |
| `cancelamento_viagem` | `{{rota}}` | `ROUTE_CANCELLED` |

> **Ação necessária antes do deploy em produção:** Templates precisam ser criados e aprovados no Meta Business Manager com o nome **exato** especificado acima (snake_case). Os nomes no código (`embarque_confirmado`, `desembarque_confirmado`, `cancelamento_viagem`) devem corresponder 100% ao nome registrado no Meta — qualquer divergência causa falha silenciosa (o `WhatsAppService` swallows errors por design). Confirmar nomes antes do deploy.
