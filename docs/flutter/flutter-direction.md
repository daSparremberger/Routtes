# Routtes App — Direção de Produto Flutter

> **Fase 5 — Direção do App Flutter**
> Documento de referência para construção dos apps Routtes App e Routtes All.
> Derivado do vault CORE, design system do Dashboard e requisitos funcionais RF09–RF21.

---

## 1. Contexto e Premissas

### 1.0 Orientação e dispositivos

O app roda **prioritariamente em landscape (horizontal)**:
- Celulares montados no painel do veículo em suporte horizontal
- Tablets embarcados no totem (7" a 10")

Toda a arquitetura de layout da tela de execução é desenhada para landscape. As telas de cadastro (Routtes All) e histórico aceitam portrait também, mas landscape é sempre funcional.

```
Resolução mínima de referência: 800 × 480dp (landscape)
Resolução alvo totem:           1024 × 600dp
Resolução alvo celular deitado: 740 × 360dp
```

`SystemChrome.setPreferredOrientations` deve incluir `landscapeLeft` e `landscapeRight` para todas as telas operacionais. Portrait liberado apenas para login, cadastro e histórico.

---

### 1.1 Dois apps, um codebase

O sistema define duas interfaces mobile, implementadas como **um único app Flutter** com módulos habilitados por perfil:

| Interface     | Dispositivo          | Usuário              | Módulos ativos                        |
|---------------|----------------------|----------------------|---------------------------------------|
| Routtes App   | Totem no veículo     | Motorista (frota)    | Autenticação · Execução · Histórico   |
| Routtes All   | Celular pessoal      | Motorista autônomo   | Todos do App + Cadastros simplificados|

A flag que determina quais módulos são exibidos vem do JWT retornado pela API após a autenticação (`role`, `plan_type`). O app não precisa de duas distribuições separadas.

### 1.2 Foco operacional acima de tudo

O motorista usa o app **enquanto dirige** (parado em pontos de embarque) ou com o dispositivo montado no painel. Toda decisão de UI deve ser avaliada com essa restrição:

- Alvos de toque mínimos: **56dp** para ações primárias em execução
- Zero distrações visuais durante a rota
- Feedback haptico + sonoro em ações críticas (embarque, fim de rota)
- Leitura a distância: fontes grandes, alto contraste

### 1.3 Stack confirmada

```
Flutter (Dart) — foco Android no MVP
Mapbox Maps SDK for Flutter
Socket.io client (dart)
Firebase Auth + Firebase Messaging (FCM)
HTTP client para REST (app-api)
```

---

## 2. Design System Mobile

### 2.1 Princípio

O app compartilha os **tokens semânticos** do Dashboard web, adaptados para mobile. Não é um design system separado — é a mesma linguagem visual em escala maior.

### 2.2 Paleta de cores

```dart
// Brand
static const Color brand600 = Color(0xFF2563EB);   // ação primária
static const Color brand50  = Color(0xFFEFF6FF);   // fundo leve

// Shell (fundo escuro do app em execução)
static const Color shell900 = Color(0xFF0B1120);   // fundo da tela de mapa
static const Color shell700 = Color(0xFF162035);   // overlay cards

// Operational states
static const Color active        = Color(0xFF10B981); // embarcado, ok
static const Color activeLight   = Color(0xFFD1FAE5);
static const Color warn          = Color(0xFFF59E0B); // atenção, atraso
static const Color warnLight     = Color(0xFFFEF3C7);
static const Color danger        = Color(0xFFEF4444); // erro, cancelado
static const Color dangerLight   = Color(0xFFFEE2E2);

// Surface
static const Color surface       = Color(0xFFF8FAFC); // fundo padrão
static const Color surfaceCard   = Color(0xFFFFFFFF);
static const Color surfaceBorder = Color(0xFFE2E8F0);

// Text
static const Color inkPrimary    = Color(0xFF0F172A);
static const Color inkSecondary  = Color(0xFF475569);
static const Color inkMuted      = Color(0xFF94A3B8);
static const Color inkInverted   = Color(0xFFF8FAFC);
```

### 2.3 Tipografia

```dart
// Fonte: Inter (Google Fonts)
// Fallback: sistema

// Escala
static const double text2xs = 10.0;  // 10px — captions, labels
static const double textXs  = 12.0;  // 12px — metadados
static const double textSm  = 14.0;  // 14px — body padrão
static const double textBase = 16.0; // 16px — body mobile
static const double textLg  = 18.0;  // 18px — seção
static const double textXl  = 20.0;  // 20px — títulos
static const double text2xl  = 24.0; // 24px — headers
static const double text3xl  = 30.0; // 30px — KPI numbers
static const double text4xl  = 36.0; // 36px — destaque máximo
```

### 2.4 Espaçamento

Grid de 4dp. Escala: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.

Em telas de execução, `padding horizontal = 20dp`. Em telas de cadastro (Routtes All), `padding horizontal = 16dp`.

### 2.5 Border radius

```
Botões:        8dp (rounded-md)
Cards:         12dp (rounded-lg)
Chips/badges:  999dp (pill)
Modais:        16dp (rounded-xl, top corners only)
```

### 2.6 Sombras

```
Card sutil:   0 1px 3px rgba(0,0,0,0.06)
Card elevado: 0 4px 6px rgba(0,0,0,0.08)
Modal/sheet:  0 -8px 32px rgba(0,0,0,0.15)
```

### 2.7 Motion

```
Duração padrão:    200ms
Curva padrão:      Curves.easeOut
Curva de entrada:  Curves.easeInOut
Curva spring:      SpringDescription(mass:1, stiffness:300, damping:25)

Proibido:
  - animações > 400ms em fluxos operacionais
  - parallax ou efeitos de scroll decorativos
  - fade em cascata em listas de operação
```

---

## 3. Arquitetura de Telas

### 3.1 Estrutura de rotas

```
/                       → Splash / verificação de sessão
/login                  → Tela de login
/invite/:token          → Completar cadastro via convite

-- App (motorista de frota) --
/home                   → Home — rota do dia
/route/:id              → Execução da rota (tela principal)
/route/:id/stop/:stopId → Detalhe da parada
/route/:id/event        → Registrar evento operacional
/route/:id/finish       → Checklist de encerramento
/history                → Histórico de execuções
/history/:id            → Detalhe de execução passada

-- Routtes All (autônomo — módulos adicionais) --
/manage/students        → Lista de alunos
/manage/students/new    → Criar aluno
/manage/students/:id    → Editar aluno
/manage/schools         → Lista de escolas
/manage/schools/new     → Criar escola
/manage/routes          → Lista de rotas
/manage/routes/new      → Criar rota

-- Compartilhado --
/profile                → Perfil do motorista
/settings               → Configurações básicas
```

### 3.2 Fluxo de navegação principal

```
Splash
  ├── não autenticado → /login
  └── autenticado
        ├── sem rota do dia → /home (estado vazio)
        └── com rota ativa → /home (CTA de iniciar)

Home
  └── iniciar execução → /route/:id
        ├── parada ativa → /route/:id/stop/:stopId
        ├── evento → /route/:id/event
        └── encerrar → /route/:id/finish → /home (concluído)
```

---

## 4. Especificação de Telas

### 4.1 Splash / Verificação de sessão

**Propósito:** verificar token, carregar dados offline, redirecionar.

**Layout:**
- Fundo: `shell900` (azul-noite)
- Centro: logotipo Routtes (SVG branco) — tamanho 80dp
- Abaixo: `ProgressIndicator` linear brand600 (discreto)
- Sem texto de loading — apenas o logo e o progress

**Comportamento:**
- Máximo 2s em condições normais
- Se offline + token válido → prossegue com dados em cache
- Se token expirado → /login

---

### 4.2 Login

**Propósito:** autenticação via Firebase Auth com conta Google.

**Layout:**
- Fundo: `surface` (branco-acinzentado)
- 60% superior: ilustração ou gradiente sutil com ícone da van + mapa
- 40% inferior: card branco arredondado (top) com:
  - Logo "Routtes" em `textXl`, `inkPrimary`, negrito
  - Subtítulo: "Área do motorista" em `textSm`, `inkMuted`
  - Botão "Entrar com Google" — full width, `brand600`, 56dp altura, ícone Google à esquerda
  - Rodapé: versão do app + link de suporte em `text2xs`

**Comportamento:**
- Loading state no botão durante auth (spinner substitui ícone)
- Erro de auth → SnackBar vermelho na base
- Sucesso → Splash de roteamento

---

### 4.3 Completar cadastro (convite)

**Propósito:** motorista conclui registro após receber link do gestor.

**Layout:**
- AppBar simples: "Completar cadastro"
- Formulário em scroll:
  - Nome completo (pré-preenchido do Google)
  - Telefone
  - CNH — número
  - Categoria CNH — SegmentedButton (B / C / D / E)
  - Validade CNH — DatePicker
- Botão "Confirmar cadastro" — fixo na base (FAB-like)

---

### 4.4 Home — Rota do dia

**Propósito:** ponto de entrada diário. Apresenta a rota preparada pelo gestor.

**Layout (com rota disponível):**

```
┌─────────────────────────────────────┐
│  [Avatar]  Bom dia, Carlos          │  ← saudação contextual
│  Seg, 24 mar · 08:12                │
├─────────────────────────────────────┤
│                                     │
│  ╔═══════════════════════════════╗  │
│  ║  ROTA DO DIA                  ║  │  ← Card principal
│  ║                               ║  │
│  ║  Rota Jardim América         ║  │
│  ║  E.M. João Pessoa · Manhã    ║  │
│  ║                               ║  │
│  ║  ┌──────┐  ┌──────┐  ┌────┐  ║  │
│  ║  │ 16   │  │  4   │  │ D  │  ║  │  ← KPIs: alunos / paradas / CNH
│  ║  │alunos│  │parad.│  │CNH │  ║  │
│  ║  └──────┘  └──────┘  └────┘  ║  │
│  ║                               ║  │
│  ║  ABC-1234 · Sprinter 415      ║  │
│  ╚═══════════════════════════════╝  │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  Lista de paradas (preview) │    │  ← 3 primeiras paradas
│  │  1. Rua das Flores, 45      │    │
│  │  2. Av. Brasil, 200         │    │
│  │  3. Rua do Bosque, 12 +13  │    │
│  └─────────────────────────────┘    │
│                                     │
│  [═══ INICIAR ROTA ═══════════════] │  ← Botão primário 56dp
└─────────────────────────────────────┘
```

**Layout (sem rota disponível):**
- Card de empty state: ícone de rota + "Nenhuma rota hoje" + "O gestor ainda não preparou sua rota"
- Botão: "Ver histórico"

**Comportamento:**
- Pull to refresh sincroniza rota do servidor
- Ao tocar no preview de paradas → modal com lista completa
- "Iniciar Rota" → confirmação rápida (BottomSheet com resumo + confirmar)
- Após confirmar → navega para /route/:id + começa transmissão GPS

---

### 4.5 Execução da Rota (tela principal)

**Propósito:** tela de trabalho do motorista durante a rota. Layout landscape-first com mapa como protagonista.

Esta é a **tela mais importante do app**. A estrutura visual é inspirada na referência de design (`design/references/flutter/design-for-primary-screen.png`): sidebar de navegação à esquerda, mapa ocupando o centro, painel de controle à direita.

---

**Layout landscape — estrutura geral:**

```
┌────┬──────────────────────────────────────┬──────────────┐
│    │                                      │              │
│    │                                      │  PAINEL DE   │
│ SB │           MAPA 3D (Mapbox)           │  PARADAS     │
│    │        (ocupa todo o centro)         │  (320dp)     │
│    │                                      │              │
│    │  [overlay: parada atual — flutuante] │              │
└────┴──────────────────────────────────────┴──────────────┘
 64dp            flex: 1                       320dp
```

---

**Sidebar esquerda (64dp, fixo):**

Fundo: `shell900`. Apenas ícones, sem labels.

```
┌────┐
│    │  ← logo Routtes (24dp, branco)
├────┤
│ 🏠 │  ← Home (inativo durante execução)
│ 🗺 │  ← Mapa (ativo — highlight brand600)
│ 📋 │  ← Lista de paradas (toggle)
│ ⚠  │  ← Registrar evento
├────┤
│    │  (flex spacer)
├────┤
│ 👤 │  ← Perfil
└────┘
```

Regras:
- Ícone ativo: `brand600` com fundo `shell700` (rounded 8dp)
- Ícone inativo: `inkMuted`
- Tooltips ao hover/long press: label do item
- Durante execução ativa, ícone "Home" tem dot vermelho piscante indicando rota em curso
- Largura fixa `64dp` — nunca colapsa durante execução

---

**Área do mapa (flex: 1, centro):**

O mapa ocupa 100% desta área sem margens. Elementos flutuam sobre ele com `Stack`.

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │ STATUS BAR (topo, overlay)                  │    │
│  │ Rota Jardim América · 14/16 alunos · 25min  │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│              [MAPA 3D MAPBOX]                        │
│         câmera inclinada 45°, follow mode            │
│                                                      │
│                  🚐 ← ícone do veículo               │
│              ━━━━━━━━━━━━                            │
│           📍 ← parada atual (pulsante)               │
│                                                      │
│  ┌──────────────────────┐                           │
│  │ 📍 Próxima parada    │ ← overlay card flutuante  │
│  │ Av. Brasil, 200      │   bottom-left, glassmorphism│
│  │ 2 alunos · ~3 min    │                           │
│  └──────────────────────┘                           │
│                           ┌────┐                    │
│                           │ ⊕  │ ← re-centrar câmera │
│                           └────┘                    │
└──────────────────────────────────────────────────────┘
```

**Status bar overlay (topo do mapa):**
- Fundo: `shell900/75%` com backdrop blur
- Padding: `12dp horizontal, 8dp vertical`
- Conteúdo: nome da rota + badge status (ping animado) + `X/Y alunos` + tempo decorrido
- Altura: `44dp`

**Overlay card "Próxima parada" (bottom-left do mapa):**
- Posicionado `bottom: 20dp, left: 16dp`
- Fundo: glass escuro (`shell900/80%`, blur 16dp)
- Borda: `shell600` 1dp
- Conteúdo: ícone pin `brand600` + endereço em `textSm` branco + metadado `text2xs` muted
- Toque no card → scroll no painel direito para a parada

**Botão re-centrar câmera:**
- Aparece apenas quando o motorista pan/zoom manual o mapa
- Ícone de "mira" em `surfaceCard` com sombra
- Posição: `bottom: 20dp, right: 16dp` (antes do painel)
- Toque → câmera volta para follow mode com animação

---

**Painel de paradas (direita, 320dp fixo):**

Fundo: `surfaceCard`. Borda esquerda: `1dp surfaceBorder`. Sem radius (encosta nas bordas).

```
┌──────────────────────────────────┐
│ PARADAS DA ROTA              4/4 │  ← header fixo
│                                  │
│ ✓ 1. Rua das Flores, 45    3 alu.│  ← concluída (cinza)
│ ✓ 2. Av. Brasil, 200       2 alu.│  ← concluída (cinza)
│ ▶ 3. Rua do Bosque, 12     4 alu.│  ← ATIVA (destaque)
│   4. Praça Central, 3      4 alu.│  ← futura
│                                  │
├──────────────────────────────────┤
│ PARADA ATUAL                     │  ← seção de ação
│ Rua do Bosque, 12                │
├──────────────────────────────────┤
│ Ana Beatriz Santos               │
│ E.M. João Pessoa · Manhã         │
│ [EMBARCOU] [PULOU] [AUSENTE]     │
├──────────────────────────────────┤
│ Bruno Carvalho                   │
│ E.M. João Pessoa · Manhã         │
│ [EMBARCOU] [PULOU] [AUSENTE]     │
├──────────────────────────────────┤
│ Diego Ferreira                   │
│ ✓ Embarcou                       │  ← já marcado (verde)
├──────────────────────────────────┤
│ Henrique Souza                   │
│ ✓ Embarcou                       │
├──────────────────────────────────┤
│ [══ CONFIRMAR PARADA ══════════] │  ← habilita após todos
└──────────────────────────────────┘
```

**Header do painel:**
- Título "PARADAS DA ROTA" em `text2xs` uppercase `inkMuted`
- Contador `X/Y` em `textSm` bold `inkPrimary`
- Fundo `surface` com border-bottom `surfaceBorder`
- Altura fixa: `40dp`

**Lista de paradas (parte superior):**
- Scroll vertical se necessário
- Altura máxima: `~35%` do painel (resto vai para seção de ação)
- Parada concluída: texto `inkMuted`, ícone ✓ verde, sem interação
- Parada ativa: fundo `brand50`, borda esquerda `3dp brand600`, texto `inkPrimary`
- Parada futura: texto `inkSecondary`, ícone círculo vazio

**Seção de ação (parte inferior — dinâmica):**
- Divide o espaço restante do painel
- Lista de alunos da parada ativa com scroll
- Cada aluno: nome bold, escola/turno em `text2xs` muted, 3 botões de ação
- Botões de ação: `height 40dp`, texto `textXs` bold, sem ícone no modo landscape
- Confirmar parada: botão `brand600` full-width `48dp`, desabilitado até todos marcados

---

**Responsividade — breakpoints:**

| Largura disponível (mapa+painel) | Painel direito |
|-----------------------------------|----------------|
| ≥ 900dp                           | 320dp fixo     |
| 700–899dp                         | 260dp fixo     |
| < 700dp (celular landscape pequeno)| 220dp fixo    |

Sidebar esquerda nunca some — apenas reduz para 56dp em telas menores.

---

### 4.6 Mapa (Mapbox)

**Configuração visual:**

```dart
MapboxMap(
  styleUri: MapboxStyles.OUTDOORS,  // ou style customizado
  camera: CameraOptions(
    bearing: heading,               // orientado para direção de movimento
    pitch: 45,                      // inclinação 3D
    zoom: 15.5,
  ),
  // Atualiza a câmera em tempo real com a posição GPS
  // animationType: CameraAnimationMode.easeTo, duration: 800ms
)
```

**Elementos no mapa:**

| Elemento         | Visual                                                          |
|------------------|-----------------------------------------------------------------|
| Rota completa    | Linha `brand600` opacidade 40%, espessura 4dp                  |
| Rota já percorrida| Linha `inkMuted` opacidade 30%                                 |
| Parada futura    | Círculo branco com borda `inkMuted`, 12dp                      |
| Parada atual     | Círculo `brand600` pulsante (scale in/out 1.0→1.4, 1.5s loop) |
| Parada concluída | Círculo `active` com checkmark SVG, 12dp                      |
| Posição do veículo| Ícone de van estilizado `brand600`, orientado pelo heading     |
| Escola (destino) | Ícone de escola `active`, 20dp, label abaixo                  |

**Follow mode:**
- A câmera segue o veículo automaticamente com bearing = heading do GPS
- Pitch 45° durante execução ativa (estilo 3D)
- Ao tocar no mapa → câmera libera o follow mode (ícone de "re-centrar" aparece no canto)
- Após 8s sem interação → re-centra automaticamente no veículo

**Zoom dinâmico:**
- Parado ou movimento lento (< 5km/h) → zoom 16.5
- Em movimento (> 5km/h) → zoom 14.5
- Aproximando próxima parada (< 200m) → zoom 17 + câmera aponta para a parada

---

### 4.7 Controle de Parada

**Propósito:** registrar o status de cada aluno em cada parada.

Em landscape, o controle de parada ocorre **inteiramente no painel direito** — não há bottom sheet. O painel já está visível e exibe os alunos da parada ativa.

**Em portrait** (histórico, cadastros — Routtes All), usar bottom sheet com drag handle.

**Estados dos botões de ação por aluno:**

| Ação     | Cor ativa         | Ícone         | Significado                   |
|----------|-------------------|---------------|-------------------------------|
| Embarcou | `active` (verde)  | ✓ check       | Aluno entrou na van           |
| Pulou    | `warn` (âmbar)    | → arrow-right | Estava no ponto, não embarcou |
| Ausente  | `danger` (vermelho)| × close      | Não apareceu no ponto         |

**Regras:**
- Os 3 botões são mutuamente exclusivos por aluno
- "Confirmar parada" só habilita após TODOS os alunos da parada terem uma marcação
- Ao confirmar → feedback haptico forte + animação de conclusão da parada no mapa
- Aluno com status já marcado pode ser alterado (toque novamente = desmarcar)

**Atalho "Marcar todos como embarcados":**
- Botão secundário visível quando nenhum aluno foi marcado ainda
- Ação: preenche todos como "Embarcou" de uma vez
- Requer confirmação em BottomSheet para evitar acidente

---

### 4.8 Detalhe da Parada

Em landscape, o detalhe da parada **é o painel direito expandido** — não é uma tela separada. Tocar no nome de uma parada futura na lista rola o painel para aquela parada e mostra o endereço completo + mini mapa estático (Mapbox Static API, 280×100dp) como preview da localização no topo da seção de ação.

Botão "Abrir navegação" → chama `mapbox://navigation` ou fallback Google Maps com as coordenadas da parada.

---

### 4.9 Registrar Evento Operacional

**Propósito:** motorista reporta ocorrência durante a rota.

**Layout (modal/sheet):**

```
┌─────────────────────────────────────┐
│  Registrar Evento                   │
│  Rota Jardim América · Parada 2     │
├─────────────────────────────────────┤
│  Tipo de evento:                    │
│                                     │
│  ┌──────────┐ ┌──────────┐          │
│  │ ⚠ Atraso│ │ 🔧 Avaria │         │
│  └──────────┘ └──────────┘          │
│  ┌──────────┐ ┌──────────┐          │
│  │ ↗ Desvio│ │ 📝 Outros │         │
│  └──────────┘ └──────────┘          │
│                                     │
│  Observação (opcional):             │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│  [CANCELAR]     [REGISTRAR EVENTO]  │
└─────────────────────────────────────┘
```

**Comportamento:**
- Tipos: `delay` / `breakdown` / `detour` / `other`
- Atraso → campo de estimativa de minutos (numérico) aparece
- Ao registrar → API call + notificação push para gestor (via FCM)
- Toast de confirmação + retorna à tela de execução

---

### 4.10 Checklist de Encerramento

**Propósito:** tela de segurança obrigatória antes de finalizar a rota. Implementa a **trava anti-esquecimento**.

Esta tela é intencionalmente **difícil de passar sem atenção real**.

**Layout:**

```
┌─────────────────────────────────────┐
│  Encerrar Rota                      │
│                                     │
│  Revise antes de encerrar           │
│                                     │
│  Resumo da execução:                │
│  ┌───────────────────────────────┐  │
│  │ ✓ 14 alunos embarcados        │  │
│  │ → 2 pularam (Parada 1 e 3)    │  │
│  │ ✗ 0 ausentes                  │  │
│  └───────────────────────────────┘  │
│                                     │
│  Checklist obrigatório:             │
│                                     │
│  □ Verifiquei que não há alunos     │
│    adormecidos ou escondidos        │
│                                     │
│  □ Todos os alunos que embarcaram  │
│    foram desembarcados              │
│                                     │
│  □ O veículo está em local seguro  │
│                                     │
│  [ENCERRAR ROTA] ← só habilita com │
│                    todos os checks  │
└─────────────────────────────────────┘
```

**Bloqueio por aluno não desembarcado:**
- Se o sistema detectar aluno com embarque sem desembarque registrado → tela bloqueada
- Mensagem de erro clara: "Lucas Barbosa embarcou na Parada 1 mas não foi desembarcado."
- Botão de ação: "Ir para parada de Lucas" → retorna ao mapa centrado na parada pendente

**Após encerramento com sucesso:**
- Animação de conclusão (confetti discreto ou checkmark animado)
- Card com resumo: duração, alunos, % presença
- Botão: "Ver histórico" ou "Voltar ao início"

---

### 4.11 Histórico de Execuções

**Layout:**
- AppBar: "Histórico"
- Lista com cards por execução (data, rota, alunos, duração, badge de status)
- Pull to refresh
- Scroll infinito (página de 20 itens)

**Card de execução:**
```
┌─────────────────────────────────────┐
│  Seg 24 mar · 08:15                 │  ← data/hora
│  Rota Jardim América                │  ← nome
│  E.M. João Pessoa · Manhã           │  ← escola/turno
│                                     │
│  16 alunos · 52 min · [Concluída]  │  ← métricas + badge
└─────────────────────────────────────┘
```

**Detalhe da execução (tap no card):**
- Resumo: duração, km percorridos (se disponível), horário de início/fim
- Paradas: lista de todas as paradas com status de cada aluno
- Eventos registrados (se houver)
- Mapa estático com traçado da rota (screenshot do Mapbox)

---

### 4.12 Cadastros simplificados (Routtes All only)

**Alunos:**
- Lista com search e filtro por escola
- Formulário: nome, escola, turno, endereço de embarque, responsável, telefone
- Mesmo padrão visual dos outros formulários do app

**Escolas:**
- Lista com search
- Formulário: nome, endereço, telefone, turnos atendidos

**Rotas:**
- Lista com filtro por turno e status
- Criar rota: nome, escola, turno, tipo (ida/volta/ida-volta)
- Adicionar paradas: busca por endereço (Mapbox Geocoding) + ordenação manual por drag
- Visualizar paradas no mapa antes de salvar
- Botão "Otimizar ordem" (chama Mapbox Directions API via backend)

---

### 4.13 Perfil e Configurações

**Perfil:**
- Avatar (inicial do nome ou foto Google)
- Nome, telefone, CNH + categoria + validade
- Badge do tipo de conta (Motorista / Autônomo)
- Botão "Sair"

**Configurações:**
- Notificações FCM: ativar/desativar por tipo
- Qualidade do mapa offline: baixa / média / alta
- Informações do app: versão, contato de suporte

---

## 5. Comportamento Offline

### 5.1 O que funciona offline

| Funcionalidade                       | Requer internet |
|--------------------------------------|-----------------|
| Carregar rota do dia                 | ✅ Sim (inicial) |
| Mapa base (tiles)                    | Cache local     |
| Iniciar execução                     | ✅ Sim          |
| Marcar embarque/desembarque          | ❌ Não (queue)  |
| Registrar evento operacional         | ❌ Não (queue)  |
| Transmissão GPS em tempo real        | ✅ Sim (WebSocket) |
| Encerrar rota                        | ✅ Sim          |

### 5.2 Modo de operação degradada

- Ao perder conexão durante execução: banner amarelo no topo "Sem internet — ações serão sincronizadas quando a conexão retornar"
- Todas as ações de marcação (embarque/desembarque) são enfileiradas localmente (SQLite local)
- Ao reconectar: fila é processada em ordem + GPS transmitido para posição atual
- Transmissão de GPS é suspensa offline (não faz sentido sem WebSocket)

---

## 6. Componentes Flutter Recomendados

### 6.1 Navigation

```dart
// Shell com bottom nav apenas para Routtes All
// Routtes App não tem bottom nav — navegação linear por execução

// Routtes All: 3 tabs
// [Início] [Rota/Execução] [Histórico]
// Routtes All adiciona: [Gerenciar]
```

### 6.2 Componentes-chave a implementar

| Componente            | Descrição                                                    |
|-----------------------|--------------------------------------------------------------|
| `AppShell`            | Wrapper com AppBar adaptativa (escura em execução, clara fora)|
| `RouteCard`           | Card da rota do dia com KPIs                                 |
| `StopCard`            | Card de parada no panel inferior                             |
| `StudentActionRow`    | Linha com nome do aluno + 3 botões de ação                  |
| `MapOverlay`          | Card flutuante sobre o mapa (parada atual, status)           |
| `ExecutionHeader`     | Header compacto durante execução                             |
| `StatusBadge`         | Badge colorido por status (igual ao web)                     |
| `BottomSheetHandle`   | Handle visual padrão para DraggableScrollableSheet           |
| `EventTypeChip`       | Chip selecionável para tipo de evento                        |
| `ChecklistItem`       | Item de checklist com checkbox grande (56dp)                 |
| `EmptyStateView`      | Empty state com ícone, título e subtítulo                    |
| `LoadingOverlay`      | Overlay de loading para ações críticas                       |

### 6.3 Packages recomendados

```yaml
dependencies:
  # Mapas
  mapbox_maps_flutter: ^2.x

  # Auth
  firebase_auth: ^5.x
  google_sign_in: ^6.x

  # Push notifications
  firebase_messaging: ^15.x

  # Realtime (GPS)
  socket_io_client: ^2.x

  # HTTP
  dio: ^5.x

  # Estado
  flutter_riverpod: ^2.x  # ou bloc — a definir pela equipe

  # Cache local (offline)
  drift: ^2.x  # SQLite type-safe

  # Tipografia
  google_fonts: ^6.x  # Inter

  # Utilitários
  go_router: ^14.x    # navegação declarativa
  permission_handler: ^11.x  # GPS permission
  geolocator: ^13.x   # posição GPS
  haptic_feedback: nativo via HapticFeedback
  flutter_local_notifications: ^17.x
```

---

## 7. Fluxo de Autenticação

```
1. App abre → verifica token Firebase local
2. Token válido → chama GET /auth/me (app-api)
3. Backend retorna { user, tenant, role, plan_type }
4. App armazena contexto em memória (Riverpod/Bloc)
5. Roteamento baseado em role:
   - role = driver + plan_type = fleet → modo Routtes App
   - role = driver + plan_type = standalone → modo Routtes All

Token expirado:
6. Firebase refresh automático → novo ID token
7. Re-chama /auth/me com novo token
8. Se falhar (conta revogada) → /login
```

---

## 8. Integração com API

### 8.1 Endpoints consumidos pelo app

| Endpoint                              | Quando                              |
|---------------------------------------|-------------------------------------|
| `GET /executions/today`               | Home — carregar rota do dia         |
| `POST /executions/:id/start`          | Iniciar rota                        |
| `POST /executions/:id/board`          | Marcar aluno embarcou               |
| `POST /executions/:id/skip`           | Marcar aluno pulou                  |
| `POST /executions/:id/absent`         | Marcar aluno ausente                |
| `POST /executions/:id/event`          | Registrar evento operacional        |
| `POST /executions/:id/finish`         | Encerrar rota                       |
| `GET /executions/history`             | Histórico do motorista              |
| `WS socket.io → emit gps:update`      | Transmitir posição em tempo real    |

### 8.2 Payload de GPS (Socket.io)

```json
{
  "execution_id": "uuid",
  "lat": -23.5505,
  "lng": -46.6333,
  "heading": 127.4,
  "speed": 32.5,
  "accuracy": 5.2,
  "timestamp": "2026-03-24T08:14:32Z"
}
```

Emitido a cada **15 segundos** durante execução ativa (configurável).

---

## 9. Direção Visual — Resumo

| Contexto              | Paleta dominante              | Sensação visual              |
|-----------------------|-------------------------------|------------------------------|
| Login / Splash        | Shell escuro + brand600       | Premium, confiança           |
| Home (fora de rota)   | Surface claro + cards brancos | Limpo, operacional           |
| Mapa (em execução)    | Shell900 overlay + brand + mapa | Focado, profissional         |
| Panel de paradas      | Branco com bordas sutis       | Acessível, claro, grande     |
| Eventos / alertas     | Warn (âmbar) ou danger (vermelho) | Urgência sem ansiedade    |
| Conclusão / histórico | Active (verde) + surface      | Positivo, tranquilo          |

---

## 10. Checklist para o desenvolvedor Flutter

Antes de considerar uma tela pronta, verificar:

**Layout e orientação:**
- [ ] Tela de execução roda exclusivamente em landscape — `setPreferredOrientations` configurado
- [ ] Sidebar esquerda (64dp) presente e funcional em toda tela operacional
- [ ] Painel direito (320dp) não some nem colapsa durante execução
- [ ] Mapa ocupa 100% da área central sem margens ou padding
- [ ] Overlays do mapa (status bar, next stop card) não cobrem controles críticos
- [ ] Botão re-centrar aparece apenas após interação manual no mapa

**Toque e acessibilidade:**
- [ ] Alvos de toque ≥ 44dp (mínimo); 48dp para ações de alunos no painel
- [ ] Funciona com fonte do sistema aumentada (acessibilidade)
- [ ] Feedback haptico em ações de embarque/desembarque

**Estados e dados:**
- [ ] Estado de loading claro em todas as ações assíncronas
- [ ] Tratamento de erro com mensagem legível (sem stack trace)
- [ ] Comportamento offline testado (sem internet)
- [ ] GPS permission solicitada antes de iniciar a rota (não antes)

**Fluxo operacional:**
- [ ] Trava anti-esquecimento impede encerramento com aluno não desembarcado
- [ ] Confirmar parada desabilitado até todos os alunos terem status
- [ ] Notificação FCM em foreground não interrompe fluxo de execução
- [ ] Dark mode não é suportado no MVP — não testar

---

## Documentos relacionados

- `RouttesApp_Core/CORE/Interfaces.md` — definição das interfaces
- `RouttesApp_Core/CORE/Estrutura de telas.md` — hierarquia de telas
- `RouttesApp_Core/CORE/Requisitos funcionais.md` — RF14, RF15, RF19, RF21
- `RouttesApp_Core/CORE/Público-alvo - personas.md` — persona Motorista
- `apps/web/tailwind.config.ts` — tokens do design system web (referência)
- `services/app-api/` — backend que o app consome
