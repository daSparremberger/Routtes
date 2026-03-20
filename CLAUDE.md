# CLAUDE.md — Routtes Project

## Divisão de responsabilidades por agente

| Agente | Papel | Escopo |
|---|---|---|
| **Antigravity / Gemini** | Frontend | `apps/web/` (Next.js), componentes, páginas, UI/UX, design system, Tailwind, shadcn/ui |
| **Codex** | Debugging & Testes | Identificar erros, rodar testes, analisar stack traces, retornar diagnóstico estruturado de falhas |
| **Claude Code** | Backend & Infra | `services/app-api/`, `services/management-api/`, NestJS, SQL/migrations, Railway, Firebase, Socket.io |

### Papel do Claude Code (este agente)

Claude Code é responsável exclusivamente por:
- Construção e evolução dos backends NestJS (`app-api` e `management-api`)
- Endpoints, services, guards, módulos, DTOs
- Migrations e queries SQL (via Neon)
- Deploy e infraestrutura (Railway)
- Integração Firebase FCM / Auth
- Socket.io e realtime
- `packages/shared/` — tipos e utilitários compartilhados

**Não implementar frontend.** Se a task for de UI/componentes/páginas, avisar o usuário para usar Antigravity/Gemini.
**Não diagnosticar bugs isoladamente.** Se receber um stack trace ou falha de teste, sugerir que o usuário passe para Codex obter diagnóstico antes de pedir o fix.

---

## O projeto

**Routtes** é uma plataforma SaaS de gestão operacional para transporte escolar.
Stack: NestJS + TypeScript (backend), Next.js (web dashboard), Flutter (mobile),
PostgreSQL/Neon (banco), Firebase Auth + FCM (autenticação + notificações),
Railway (infraestrutura), Mapbox (mapas), Socket.io (realtime).

apps/web/                # Next.js — Dashboard (Gestor + SuperAdmin)
services/app-api/        # NestJS — API operacional (porta 3001)
services/management-api/ # NestJS — API de plataforma (porta 3000)
packages/shared/         # Tipos e utilitários compartilhados
docs/plans/              # Planos de implementação
docs/specs/              # Specs de features (pós-brainstorming)
docs/ui-reviews/         # Resultados de auditoria de UI
```

Worktree de contexto: `C:\Worktree\RouttesApp\`

---

## Fonte de verdade: Obsidian vault

O vault em `RouttesApp_Core/CORE/` é a **fonte de verdade** do projeto.

**Regra absoluta:** Qualquer mudança de escopo, requisito, arquitetura, modelo de dados
ou decisão tecnológica é registrada no vault **antes ou junto** com o código.
O código deve refletir a documentação — nunca o contrário.

**Ponto de entrada:** Sempre ler `RouttesApp_Core/CORE/_Index.md` antes de qualquer tarefa.

---

## Seleção de modelo

| Complexidade | Modelo | Quando usar |
|---|---|---|
| **Baixa** | `claude-haiku-4-5-20251001` | Editar docs Obsidian, lookups, formatação, verificações simples |
| **Média** | `claude-sonnet-4-6` | Implementar features, code review, debug, planejar, criar PRs |
| **Alta** | `claude-opus-4-6` | Arquitetura complexa, decisões críticas que afetam múltiplos módulos |

**Default:** Sonnet 4.6. Só subir para Opus quando a decisão tiver impacto arquitetural amplo.

---

## SKILLS DE FERRAMENTAS EXTERNAS — uso obrigatório

Estas skills encapsulam todo o conhecimento operacional das ferramentas do projeto.
**Nunca opere Railway, Neon, Firebase ou GitHub sem invocar a skill correspondente.**

### railway:use-railway → Deploy, infraestrutura, logs, variáveis

**Invocar quando:**
- Deploy de qualquer serviço (App-Api, Management-Api, Web)
- Verificar ou alterar variáveis de ambiente de produção
- Checar logs de build ou runtime
- Diagnosticar falha de deploy no Railway
- O usuário mencionar Railway, produção, build failure, serviço, env var

**O que a skill fornece:**
- IDs de projeto/serviço/ambiente já preenchidos
- Roteamento MCP vs CLI Railway
- Fluxo de deploy por serviço do monorepo
- Troubleshooting de erros comuns

**Ação:** `Skill tool → skill: "railway:use-railway"`

---

### use-neon → Banco de dados, SQL, migrations, schema

**Invocar quando:**
- Executar qualquer query SQL no banco de produção
- Criar ou aplicar uma migration
- Inspecionar schema de tabelas
- Criar branch Neon para testar migration
- Diagnosticar problemas de conexão ou performance
- O usuário mencionar banco, tabela, SQL, migration, schema, query

**O que a skill fornece:**
- Project ID e connection string já preenchidos
- Schema completo (schemas `app` e `management` com todas as tabelas)
- Fluxo seguro de migration via branch Neon
- Queries de diagnóstico comuns
- Migrations já aplicadas (número do próximo a criar)

**Ação:** Ler `RouttesApp_Core/SKILLS/use-neon/SKILL.md`

---

### use-firebase → Push notifications (FCM), Auth tokens, Admin SDK

**Invocar quando:**
- Enviar ou debugar push notifications (FCM)
- Verificar tokens de autenticação Firebase
- Configurar ou inspecionar o projeto Firebase
- Trabalhar com Firebase Admin SDK nos backends
- O usuário mencionar Firebase, FCM, push, Auth token, `google-services.json`

**O que a skill fornece:**
- Project ID e service account do projeto `routtes-app`
- Padrões de código FCM (send individual e multicast)
- Mapeamento de erros FCM comuns e soluções
- Regras de segurança: nunca commitar credenciais

**Ação:** Ler `RouttesApp_Core/SKILLS/use-firebase/SKILL.md`

---

### use-github → Issues, PRs, branches, code review

**Invocar quando:**
- Criar ou revisar um Pull Request
- Abrir ou comentar em issues
- Buscar código no repositório
- Criar branches com nomenclatura correta
- Fazer merge de PRs

**O que a skill fornece:**
- Roteamento MCP GitHub (preferir sobre `gh` CLI)
- Convenções de nomenclatura de branch
- Templates de PR e issue
- Regras: nunca push direto em `main`

**Ação:** Ler `RouttesApp_Core/SKILLS/use-github/SKILL.md`

---

## Fluxo de trabalho padrão

### Nova feature

```
1. Ler RouttesApp_Core/CORE/_Index.md → entender contexto
2. Skill: superpowers:brainstorming → definir design
3. Skill: superpowers:writing-plans → criar plano em docs/plans/
4. Skill: superpowers:executing-plans → executar o plano
5. Skill: superpowers:verification-before-completion → confirmar que funciona
6. Skill: superpowers:requesting-code-review → revisar antes do PR
7. Skill: use-github → criar PR
8. Skill: railway:use-railway → deploy
```

### Bug

```
1. Skill: superpowers:systematic-debugging → causa raiz
2. Fix mínimo para a causa raiz
3. Skill: superpowers:verification-before-completion → confirmar resolvido
4. Skill: use-github → PR com fix
5. Skill: railway:use-railway → deploy
```

### Migration de banco

```
1. Skill: use-neon → rever schema atual + migrations aplicadas
2. Escrever SQL da migration numerada sequencialmente
3. Criar branch Neon de teste
4. Aplicar migration na branch de teste
5. Comparar schema: mcp__neon__compare_database_schema
6. Aplicar em produção (main branch Neon)
7. Atualizar Modelagem de dados no vault manualmente
```

### Push notification / Firebase

```
1. Skill: use-firebase → entender contexto FCM do projeto
2. Implementar/corrigir usando padrões da skill
3. Verificar tokens na tabela de device tokens (a criar via migration)
4. Testar e confirmar ausência de erros de token expirado
```

### Mudança de escopo ou requisito

```
1. Atualizar vault (CORE/) PRIMEIRO — registrar a mudança
2. Skill: superpowers:writing-plans → planejar implementação (se houver código)
3. ... (fluxo normal de feature)
```

### Revisar UI do Dashboard

```
1. Skill: ui-ux-pro-max → diretrizes de design
2. Implementar/ajustar
3. Skill: superpowers:requesting-code-review → revisar 6 pilares de UX
4. Aplicar top 3 fixes
```

## Regras de comportamento permanentes

### Antes de qualquer implementação
1. Ler `RouttesApp_Core/CORE/_Index.md`
2. Verificar qual RF a tarefa cobre
3. Feature nova → Skill: superpowers:brainstorming primeiro
4. Plano existente → Skill: superpowers:executing-plans

### Segurança (inegociável)
1. Zero secrets em código — sempre Railway env vars
2. `google-services.json` nunca commitado
3. Toda query operacional escoped por `tenant_id`
4. Push direto em `main` proibido — sempre PR

### Migrations (Neon)
1. Numerar sequencialmente a partir de **001** (nenhuma migration aplicada ainda)
2. Testar em branch Neon antes de aplicar ao main
3. Usar `mcp__neon__compare_database_schema` para verificar o diff

### Auto-melhoria de skills

Ao final de qualquer task, verificar:

| Sinal | Ação |
|---|---|
| Skill não cobria um caso encontrado | Adicionar o caso ao skill |
| Informação desatualizada (ID, tabela, variável) | Corrigir inline |
| Padrão recorrente do Routtes descoberto | Documentar na seção relevante |
| Erro novo e solução encontrados | Adicionar ao Troubleshooting |
| Skill guiou de forma imprecisa | Corrigir o trecho incorreto |

**Como aplicar:**
1. Resolver a task com best effort
2. Abrir o arquivo do skill correspondente
3. Usar a seção `## Auto-Melhoria` do arquivo
4. Adicionar conhecimento novo conciso e **específico ao Routtes**
5. Atualizar o Log de melhorias: `- YYYY-MM-DD: [o que foi adicionado]`

Limites: apenas o específico ao Routtes, apenas observado em uso real,
arquivos ≤ 500 linhas, mudanças > 10 linhas devem ser propostas antes.

### Protocolo de conclusão de task
Quando o usuário confirmar que a task funcionou:
1. Fechar o contexto atual
2. Próxima task = nova conversa (contexto limpo)

---

## Mapa de arquivos do vault e skills

```
RouttesApp_Core/
├── CORE/
│   ├── _Index.md                ← LEIA PRIMEIRO
│   ├── Arquitetura técnica.md
│   ├── Casos de uso.md
│   ├── Documento de Escopo do Projeto.md
│   ├── Documento de Visão do projeto.md
│   ├── Estrutura de telas.md
│   ├── Integrações externas.md
│   ├── Interfaces.md
│   ├── Modelagem de dados.md
│   ├── Público-alvo - personas.md
│   ├── Requisitos funcionais.md
│   ├── Requisitos não funcionais.md
│   └── Stack de tecnologias.md
│
└── SKILLS/
    ├── use-railway/SKILL.md     ← deploy, logs, variáveis (MCP + CLI)
    ├── use-neon/SKILL.md        ← SQL, migrations, schema completo
    ├── use-firebase/SKILL.md    ← FCM, Auth, Admin SDK
    ├── use-github/SKILL.md      ← Issues, PRs, branches
    └── vault/
        └── obsidian-markdown/SKILL.md ← sintaxe correta para editar o vault
```
