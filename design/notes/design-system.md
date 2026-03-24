# Routtes Design System

## Identidade Visual

**Posicionamento:** produto premium de inteligência operacional logística.
Não é um SaaS genérico. É uma ferramenta de controle com estética de produto maduro.

---

## Cores

### Brand (Azul — tecnologia, confiança, inteligência)
| Token | Hex | Uso |
|---|---|---|
| brand-600 | `#2563EB` | Ação primária, links, foco |
| brand-100 | `#DBEAFE` | Backgrounds informativos |
| brand-50  | `#EFF6FF` | Hover states suaves |

### Shell (Navy dark — sidebar, autoridade)
| Token | Hex | Uso |
|---|---|---|
| shell-900 | `#0B1120` | Sidebar background |
| shell-800 | `#0F1729` | Hover na sidebar |
| shell-700 | `#162035` | Item ativo na sidebar |
| shell-600 | `#1E2D45` | Bordas e divisores internos |

### Estados Operacionais
| Estado | Token | Hex | Uso |
|---|---|---|---|
| Ativo/Em andamento | `active` | `#10B981` | Execução, aprovado |
| Alerta/Pendente | `warn` | `#F59E0B` | Atenção, atraso |
| Cancelado/Erro | `danger` | `#EF4444` | Cancelamento, falha |

### Surface
| Token | Hex | Uso |
|---|---|---|
| surface | `#F8FAFC` | Fundo de página |
| surface-card | `#FFFFFF` | Cards e painéis |
| surface-border | `#E2E8F0` | Bordas e divisores |
| surface-hover | `#F1F5F9` | Hover states |

### Texto (Ink)
| Token | Hex | Uso |
|---|---|---|
| ink-primary | `#0F172A` | Texto principal |
| ink-secondary | `#475569` | Texto de suporte |
| ink-muted | `#94A3B8` | Placeholders, legendas |
| ink-inverted | `#F8FAFC` | Texto sobre dark bg |

---

## Tipografia

**Família:** Inter (sans) + JetBrains Mono (mono para IDs, dados numéricos)

| Uso | Size | Weight |
|---|---|---|
| Heading de página | 18px (lg) | 600 |
| Heading de seção | 14px (sm) | 600 |
| Body | 14px (sm) | 400 |
| Caption/label | 12px (xs) | 500 |
| Micro (badges, 2xs) | 10px | 600 |
| KPI numbers | 30px (3xl) | 600, tabular |

---

## Espaçamento

Grid base de **4px**. Usar sempre múltiplos de 4.

| Scale | px | Uso |
|---|---|---|
| 1 | 4px | Gap mínimo |
| 2 | 8px | Padding interno de elementos pequenos |
| 3 | 12px | Gap entre items de lista |
| 4 | 16px | Padding padrão de cards |
| 5 | 20px | Padding interno de cards |
| 6 | 24px | Gap entre cards |
| 8 | 32px | Separação de seções |
| 12 | 48px | Espaçamento de seções grandes |

---

## Border Radius

| Token | Value | Uso |
|---|---|---|
| sm | 4px | Badges pequenos, inputs |
| DEFAULT | 6px | Buttons |
| md | 8px | Cards, inputs |
| lg | 12px | Cards destacados, modals |
| xl | 16px | Painéis grandes |
| full | 9999px | Badges pill, avatares |

---

## Sombras

| Token | Uso |
|---|---|
| `shadow-card` | Card padrão (sutil) |
| `shadow-card-md` | Card em hover |
| `shadow-card-lg` | Dropdowns, popovers |
| `shadow-modal` | Modais e drawers |
| `shadow-sidebar` | Sidebar lateral |

---

## Layout

| Token | Value |
|---|---|
| Sidebar width | 240px |
| Sidebar collapsed | 64px |
| Header height | 60px |
| Page padding | 24px (p-6) |
| Max content width | 1400px |

---

## Motion

**Princípio:** funcional, não decorativo. Toda animação tem causa-efeito.

| Token | Duration | Easing | Uso |
|---|---|---|---|
| Fast | 150ms | ease-in-out | Hover states, color changes |
| Base | 200ms | ease-in-out | Fade in/out, scale |
| Smooth | 250ms | out-expo | Slides, entrada de elementos |

**Animações disponíveis (Tailwind):**
- `animate-fade-in` — entrada de página
- `animate-slide-up` — entrada de cards/items
- `animate-slide-in-left` — entrada lateral
- `animate-scale-in` — entrada de modais
- `animate-shimmer` — skeleton loading
- `animate-pulse-slow` — dot de status ao vivo

---

## Componentes

### Atomic
- **Button** — primary / secondary / ghost / danger / outline × sm / md / lg
- **Badge** — active / warn / danger / neutral / brand / outline + dot indicator
- **Input** — com label, hint, error, icon (left/right)
- **Avatar** — tamanhos xs→xl, fallback por iniciais com cor determinística
- **Skeleton** — shimmer loading para qualquer dimensão
- **EmptyState** — ilustração + texto + ação

### Cards
- **Card** — container base com accent opcional (bordas coloridas)
- **CardHeader** — título + subtitle + action slot
- **StatCard** — KPI com número grande, ícone, variação

### Layout
- **Shell** — sidebar + header + main (wrapper de página)
- **Sidebar** — navigation com collapse, tooltips, active indicator
- **Header** — título de página, search, notifications, actions

---

## Regras de Uso

1. **Cores operacionais têm significado** — verde = ativo/andamento, âmbar = alerta, vermelho = erro/cancelado. Nunca inverter.
2. **Nunca usar gradientes fortes** — no máximo gradiente sutil em backgrounds decorativos.
3. **Sombras progressivas** — card em repouso = `shadow-card`, hover = `shadow-card-md`.
4. **Números tabulares** — todos os dados numéricos usam `tabular-nums`.
5. **Sem emojis como ícones** — usar Lucide React exclusivamente.
6. **Sidebar sempre collapsível** — nunca travar em um estado fixo.
7. **Feedback imediato** — toda ação tem estado de loading.
