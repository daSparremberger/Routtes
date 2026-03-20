# AGENTS.md — Routtes Project
# Compatible with: Antigravity (Google), Gemini CLI, Claude Code, Codex

## Divisão de responsabilidades por agente

| Agente | Papel | Escopo |
|---|---|---|
| **Antigravity / Gemini** | Frontend | `apps/web/` (Next.js), componentes, páginas, UI/UX, design system, Tailwind, shadcn/ui |
| **Codex** | Debugging & Testes | Identificar erros, rodar testes, analisar stack traces, retornar diagnóstico estruturado de falhas |
| **Claude Code** | Backend & Infra | `services/app-api/`, `services/management-api/`, NestJS, SQL/migrations, Railway, Firebase, Socket.io |

### Regras de roteamento

- **Frontend** (componentes, páginas, estilos, animações, responsividade) → **Antigravity/Gemini**
- **Bug, falha de teste, stack trace, erro de runtime** → **Codex** — deve retornar: causa raiz, arquivo:linha, reprodução mínima
- **Endpoint, service, módulo NestJS, migration SQL, deploy, variável de ambiente, notificação** → **Claude Code**
- **Dúvida de escopo ou arquitetura** → atualizar vault CORE/ primeiro, depois retornar ao agente correto

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

| Complexidade | Modelo recomendado | Quando usar |
|---|---|---|
| **Baixa** | `gemini-2.0-flash` | Editar docs, lookups, formatação, verificações simples |
| **Média** | `gemini-2.5-pro` | Implementar features, code review, debug, planejar, criar PRs |
| **Alta** | `gemini-2.5-pro` + contexto amplo | Arquitetura complexa, decisões críticas que afetam múltiplos módulos |

**Default:** Gemini 2.5 Pro. Para tarefas simples de documentação, use Flash para economizar cota.

---

## SKILLS DE FERRAMENTAS EXTERNAS — uso obrigatório

As skills encapsulam todo o conhecimento operacional das ferramentas do projeto.
**Leia o arquivo SKILL.md correspondente antes de operar Railway, Neon, Firebase ou GitHub.**

### Como invocar skills neste ambiente

- **Antigravity:** `@use-railway`, `@use-neon`, `@use-firebase`, `@use-github`
- **Gemini CLI:** leia o arquivo SKILL.md diretamente antes de agir
- **Fallback universal:** leia o arquivo SKILL.md e aplique o conteúdo

---

### use-railway → Deploy, infraestrutura, logs, variáveis

**Arquivo:** `RouttesApp_Core/SKILLS/use-railway/SKILL.md`

**Invocar quando:**
- Deploy de qualquer serviço (App-Api, Management-Api, Web)
- Verificar ou alterar variáveis de ambiente de produção
- Checar logs de build ou runtime
- Diagnosticar falha de deploy no Railway
- Usuário mencionar Railway, produção, build failure, serviço, env var

**O que a skill fornece:**
- IDs de projeto/serviço já preenchidos
- Roteamento MCP (`mcp__railway__*`) vs CLI Railway
- Fluxo de deploy por serviço do monorepo
- Troubleshooting de erros comuns

**MCP tools disponíveis:** `mcp__railway__list-projects`, `mcp__railway__list-services`,
`mcp__railway__list-variables`, `mcp__railway__set-variables`, `mcp__railway__get-logs`,
`mcp__railway__list-deployments`, `mcp__railway__deploy`, `mcp__railway__generate-domain`

---

### use-neon → Banco de dados, SQL, migrations, schema

**Arquivo:** `RouttesApp_Core/SKILLS/use-neon/SKILL.md`

**Invocar quando:**
- Executar qualquer query SQL no banco de produção
- Criar ou aplicar uma migration
- Inspecionar schema de tabelas
- Criar branch Neon para testar migration
- Diagnosticar problemas de conexão ou performance
- Usuário mencionar banco, tabela, SQL, migration, schema, query

**O que a skill fornece:**
- Project ID `muddy-frost-12750766` e connection string já preenchidos
- Schema completo (schemas `app` e `management` com todas as tabelas)
- Fluxo seguro de migration via branch Neon
- Queries de diagnóstico comuns
- Migrations já aplicadas (próxima: **012** para app, **006** para management)

**MCP tools disponíveis:** `mcp__neon__run_sql`, `mcp__neon__run_sql_transaction`,
`mcp__neon__describe_table_schema`, `mcp__neon__get_database_tables`,
`mcp__neon__create_branch`, `mcp__neon__compare_database_schema`,
`mcp__neon__prepare_database_migration`, `mcp__neon__complete_database_migration`

---

### use-firebase → Push notifications (FCM), Auth tokens, Admin SDK

**Arquivo:** `RouttesApp_Core/SKILLS/use-firebase/SKILL.md`

**Invocar quando:**
- Enviar ou debugar push notifications (FCM)
- Verificar tokens de autenticação Firebase
- Configurar ou inspecionar o projeto Firebase
- Trabalhar com Firebase Admin SDK nos backends
- Usuário mencionar Firebase, FCM, push, Auth token, `google-services.json`

**O que a skill fornece:**
- Firebase Project ID `routtes-app` e service account
- Padrões de código FCM (send individual e multicast)
- Mapeamento de erros FCM comuns e soluções
- Regras de segurança: nunca commitar credenciais

---

### use-github → Issues, PRs, branches, code review

**Arquivo:** `RouttesApp_Core/SKILLS/use-github/SKILL.md`

**Invocar quando:**
- Criar ou revisar um Pull Request
- Abrir ou comentar em issues
- Buscar código no repositório
- Criar branches com nomenclatura correta
- Fazer merge de PRs

**O que a skill fornece:**
- Roteamento MCP GitHub (`mcp__github__*`)
- Convenções de nomenclatura de branch
- Templates de PR e issue
- Regras: nunca push direto em `main`

**MCP tools disponíveis:** `mcp__github__create_pull_request`, `mcp__github__create_issue`,
`mcp__github__list_pull_requests`, `mcp__github__get_pull_request_files`,
`mcp__github__create_pull_request_review`, `mcp__github__merge_pull_request`,
`mcp__github__search_code`, `mcp__github__push_files`

---

## Fluxo de trabalho padrão

### Nova feature

```
1. Ler RouttesApp_Core/CORE/_Index.md → entender contexto
2. Brainstorming → definir design e requisitos
3. Criar plano detalhado em docs/plans/ com passos atômicos
4. Executar o plano passo a passo com commits atômicos
5. Verificar que a feature entrega o objetivo (não apenas que as tasks foram marcadas)
6. Revisar código antes do PR
7. SKILL use-github → criar PR
8. SKILL use-railway → deploy
```

### Bug

```
1. Identificar causa raiz (hipótese → teste → evidência) antes de qualquer fix
2. Fix mínimo para a causa raiz
3. Verificar que o fix resolve sem regressões
4. SKILL use-github → PR com fix
5. SKILL use-railway → deploy
```

### Migration de banco

```
1. SKILL use-neon → rever schema atual + migrations aplicadas
2. Escrever SQL da migration numerada sequencialmente
3. Criar branch Neon de teste via mcp__neon__create_branch
4. Aplicar migration na branch de teste
5. Comparar schema via mcp__neon__compare_database_schema
6. Aplicar em produção (main branch Neon)
7. Atualizar Modelagem de dados no vault manualmente
```

### Push notification / Firebase

```
1. SKILL use-firebase → entender contexto FCM do projeto
2. Implementar/corrigir usando padrões da skill
3. Verificar tokens em app.device_tokens
4. Confirmar ausência de erros de token expirado
```

### Mudança de escopo ou requisito

```
1. Atualizar vault (CORE/) PRIMEIRO — registrar a mudança
2. Criar plano de implementação em docs/plans/
3. ... (fluxo normal de feature)
```

---

## Regras de comportamento permanentes

### Antes de qualquer implementação
1. Ler `RouttesApp_Core/CORE/_Index.md`
2. Verificar qual RF (Requisito Funcional) a tarefa cobre
3. Feature nova → brainstorming/design antes de qualquer código
4. Plano existente → seguir o plano sem desvios sem justificativa

### Segurança (inegociável)
1. Zero secrets em código — sempre Railway env vars
2. `google-services.json` nunca commitado
3. Toda query operacional escoped por `tenant_id`
4. Push direto em `main` proibido — sempre PR

### Migrations (Neon)
1. Numerar sequencialmente (próximo: **012** para app, **006** para management)
2. Testar em branch Neon antes de aplicar ao main
3. Usar `mcp__neon__compare_database_schema` para verificar o diff

### Auto-melhoria de skills

Ao final de qualquer task, verificar:

| Sinal | Ação |
|---|---|
| Skill não cobria um caso encontrado | Adicionar o caso ao arquivo SKILL.md |
| Informação desatualizada (ID, tabela, variável) | Corrigir inline no SKILL.md |
| Padrão recorrente do Routtes descoberto | Documentar na seção relevante |
| Erro novo e solução encontrados | Adicionar ao Troubleshooting da skill |

Limites: apenas o específico ao Routtes, apenas observado em uso real,
arquivos ≤ 500 linhas, mudanças > 10 linhas devem ser propostas antes.

### Protocolo de conclusão de task
Quando o usuário confirmar que a task funcionou:
1. Fechar o contexto atual
2. Próxima task = nova conversa (contexto limpo)

---

## Mapa de arquivos

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
