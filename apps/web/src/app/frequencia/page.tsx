'use client'

import { useState, useMemo } from 'react'
import { Shell } from '@/components/layout/shell'
import {
  Button, Badge, Card, CardHeader, StatCard,
  EmptyState, Skeleton,
} from '@/components/ui'
import {
  CalendarCheck, ChevronLeft, ChevronRight,
  Users, CheckCircle2, XCircle, Clock, Filter,
  Download, Search, School, TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Presenca = 'presente' | 'ausente' | 'dispensado' | null

interface AlunoFrequencia {
  id:      string
  nome:    string
  escola:  string
  turno:   string
  rota:    string
  dias:    Record<string, Presenca> // ISO date → presença
}

// ─── Mock data ─────────────────────────────────────────────────────────────

// Gera os últimos 7 dias úteis
function getLastWorkDays(n: number): string[] {
  const days: string[] = []
  const d = new Date()
  while (days.length < n) {
    d.setDate(d.getDate() - 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      days.unshift(d.toISOString().slice(0, 10))
    }
  }
  return days
}

const WORK_DAYS = getLastWorkDays(7)

const MOCK_FREQUENCIA: AlunoFrequencia[] = [
  {
    id:'1', nome:'Ana Beatriz Santos', escola:'E.M. João Pessoa', turno:'Manhã', rota:'Rota Jardim América',
    dias:{ [WORK_DAYS[0]]:'presente', [WORK_DAYS[1]]:'presente', [WORK_DAYS[2]]:'ausente',   [WORK_DAYS[3]]:'presente', [WORK_DAYS[4]]:'presente', [WORK_DAYS[5]]:'presente', [WORK_DAYS[6]]:'presente' },
  },
  {
    id:'2', nome:'Bruno Carvalho', escola:'E.M. João Pessoa', turno:'Tarde', rota:'Rota Centro',
    dias:{ [WORK_DAYS[0]]:'presente', [WORK_DAYS[1]]:'ausente',  [WORK_DAYS[2]]:'ausente',   [WORK_DAYS[3]]:'presente', [WORK_DAYS[4]]:'presente', [WORK_DAYS[5]]:'dispensado', [WORK_DAYS[6]]:'presente' },
  },
  {
    id:'3', nome:'Carla Mendes', escola:'E.E. Villa Nova', turno:'Manhã', rota:'Rota Vila Nova',
    dias:{ [WORK_DAYS[0]]:'presente', [WORK_DAYS[1]]:'presente', [WORK_DAYS[2]]:'presente',  [WORK_DAYS[3]]:'presente', [WORK_DAYS[4]]:'ausente',  [WORK_DAYS[5]]:'presente',   [WORK_DAYS[6]]:'presente' },
  },
  {
    id:'4', nome:'Diego Ferreira', escola:'E.E. Villa Nova', turno:'Integral', rota:'Rota Vila Nova',
    dias:{ [WORK_DAYS[0]]:'ausente',  [WORK_DAYS[1]]:'ausente',  [WORK_DAYS[2]]:'presente',  [WORK_DAYS[3]]:'presente', [WORK_DAYS[4]]:'presente', [WORK_DAYS[5]]:'presente',   [WORK_DAYS[6]]:'presente' },
  },
  {
    id:'5', nome:'Eduarda Lima', escola:'C.E.I. Pequenos Passos', turno:'Manhã', rota:'Rota CEI',
    dias:{ [WORK_DAYS[0]]:'presente', [WORK_DAYS[1]]:'presente', [WORK_DAYS[2]]:'presente',  [WORK_DAYS[3]]:'presente', [WORK_DAYS[4]]:'presente', [WORK_DAYS[5]]:'presente',   [WORK_DAYS[6]]:'presente' },
  },
  {
    id:'6', nome:'Felipe Rocha', escola:'E.M. João Pessoa', turno:'Tarde', rota:'Rota Planalto',
    dias:{ [WORK_DAYS[0]]:'ausente',  [WORK_DAYS[1]]:'ausente',  [WORK_DAYS[2]]:'ausente',   [WORK_DAYS[3]]:'dispensado', [WORK_DAYS[4]]:'ausente', [WORK_DAYS[5]]:'ausente',  [WORK_DAYS[6]]:'presente' },
  },
  {
    id:'7', nome:'Gabriela Alves', escola:'E.E. Villa Nova', turno:'Manhã', rota:'Rota Vila Nova',
    dias:{ [WORK_DAYS[0]]:'presente', [WORK_DAYS[1]]:'presente', [WORK_DAYS[2]]:'dispensado', [WORK_DAYS[3]]:'presente', [WORK_DAYS[4]]:'presente', [WORK_DAYS[5]]:'presente',  [WORK_DAYS[6]]:'presente' },
  },
  {
    id:'8', nome:'Henrique Souza', escola:'C.E.I. Pequenos Passos', turno:'Integral', rota:'Rota CEI',
    dias:{ [WORK_DAYS[0]]:'presente', [WORK_DAYS[1]]:'presente', [WORK_DAYS[2]]:'presente',  [WORK_DAYS[3]]:'ausente',  [WORK_DAYS[4]]:'presente', [WORK_DAYS[5]]:'presente',   [WORK_DAYS[6]]:'presente' },
  },
]

const ESCOLAS = ['Todas as escolas', 'E.M. João Pessoa', 'E.E. Villa Nova', 'C.E.I. Pequenos Passos']
const TURNOS  = ['Todos os turnos',  'Manhã', 'Tarde', 'Integral']

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FrequenciaPage() {
  const [search,       setSearch]       = useState('')
  const [filterEscola, setFilterEscola] = useState('Todas as escolas')
  const [filterTurno,  setFilterTurno]  = useState('Todos os turnos')

  const filtered = useMemo(() => {
    return MOCK_FREQUENCIA.filter((a) => {
      const matchSearch = !search || a.nome.toLowerCase().includes(search.toLowerCase())
      const matchEscola = filterEscola === 'Todas as escolas' || a.escola === filterEscola
      const matchTurno  = filterTurno  === 'Todos os turnos'  || a.turno  === filterTurno
      return matchSearch && matchEscola && matchTurno
    })
  }, [search, filterEscola, filterTurno])

  // Métricas globais (últimas semana)
  const allPresencas = MOCK_FREQUENCIA.flatMap((a) => Object.values(a.dias))
  const totalPresente    = allPresencas.filter((p) => p === 'presente').length
  const totalAusente     = allPresencas.filter((p) => p === 'ausente').length
  const totalDispensado  = allPresencas.filter((p) => p === 'dispensado').length
  const total            = allPresencas.filter((p) => p !== null).length
  const taxaPresenca     = total > 0 ? ((totalPresente / total) * 100).toFixed(1) : '0'

  // Alunos com mais de 2 ausências na semana
  const alertas = MOCK_FREQUENCIA.filter(
    (a) => Object.values(a.dias).filter((p) => p === 'ausente').length >= 2
  ).length

  return (
    <Shell
      title="Frequência"
      subtitle="Últimos 7 dias úteis"
      headerActions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Download size={14} />}>Exportar</Button>
        </div>
      }
    >
      <div className="space-y-5 animate-fade-in">

        {/* ── KPIs ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Taxa de presença"
            value={`${taxaPresenca}%`}
            icon={<TrendingUp size={18} />}
            iconBg="active"
            change={{ value: '+1.2% vs semana anterior', positive: true }}
          />
          <StatCard label="Presenças"   value={totalPresente}   icon={<CheckCircle2 size={18} />} iconBg="active"  />
          <StatCard label="Ausências"   value={totalAusente}    icon={<XCircle      size={18} />} iconBg="danger"  />
          <StatCard label="Com alertas" value={alertas}          icon={<Users        size={18} />} iconBg="warn"    />
        </div>

        {/* ── Filtros ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 min-w-0 sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar aluno…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="flex items-center gap-2">
            <FilterSelect value={filterEscola} options={ESCOLAS} onChange={setFilterEscola} />
            <FilterSelect value={filterTurno}  options={TURNOS}  onChange={setFilterTurno}  />
          </div>
          <div className="sm:ml-auto flex items-center gap-3">
            {/* Legenda */}
            <div className="flex items-center gap-3 text-xs text-ink-muted">
              <LegendItem color="bg-active-light text-active-dark border-active/20" label="P" />
              <LegendItem color="bg-danger-light text-danger border-danger/20" label="A" />
              <LegendItem color="bg-surface-hover text-ink-secondary border-surface-border" label="D" />
            </div>
          </div>
        </div>

        {/* ── Grid de frequência ────────────────────────────────────────────── */}
        <Card flush>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="text-left text-xs font-medium text-ink-muted px-5 py-3 min-w-[200px]">
                    Aluno
                  </th>
                  {WORK_DAYS.map((day) => {
                    const d = new Date(day + 'T12:00:00')
                    const isToday = day === new Date().toISOString().slice(0, 10)
                    return (
                      <th
                        key={day}
                        className={cn(
                          'text-center text-xs font-medium text-ink-muted px-2 py-3 w-16',
                          isToday && 'text-brand-600',
                        )}
                      >
                        <div>{d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</div>
                        <div className={cn('font-semibold', isToday ? 'text-brand-600' : 'text-ink-primary')}>
                          {d.getDate()}
                        </div>
                      </th>
                    )
                  })}
                  <th className="text-center text-xs font-medium text-ink-muted px-3 py-3 w-20">
                    Taxa
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={WORK_DAYS.length + 2} className="py-12">
                      <EmptyState
                        icon={<CalendarCheck size={22} />}
                        title="Nenhum aluno encontrado"
                        description="Tente ajustar os filtros."
                      />
                    </td>
                  </tr>
                ) : (
                  filtered.map((aluno, i) => {
                    const presencas = Object.values(aluno.dias).filter((p) => p === 'presente').length
                    const total2    = Object.values(aluno.dias).filter((p) => p !== null).length
                    const taxa      = total2 > 0 ? Math.round((presencas / total2) * 100) : 0
                    const alertFlag = Object.values(aluno.dias).filter((p) => p === 'ausente').length >= 2

                    return (
                      <tr
                        key={aluno.id}
                        className={cn(
                          'border-b border-surface-border/60 hover:bg-surface-hover/40 transition-colors',
                          i % 2 === 0 ? '' : 'bg-surface/50',
                        )}
                      >
                        {/* Aluno */}
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            {alertFlag && (
                              <span className="h-1.5 w-1.5 rounded-full bg-warn shrink-0" title="Múltiplas ausências" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-ink-primary truncate">{aluno.nome}</p>
                              <p className="text-2xs text-ink-muted flex items-center gap-1">
                                <School size={9} />
                                {aluno.escola} · {aluno.turno}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Dias */}
                        {WORK_DAYS.map((day) => {
                          const p = aluno.dias[day]
                          return (
                            <td key={day} className="px-2 py-3 text-center">
                              <PresencaCell presenca={p} />
                            </td>
                          )
                        })}

                        {/* Taxa */}
                        <td className="px-3 py-3 text-center">
                          <span className={cn(
                            'text-sm font-semibold tabular-nums',
                            taxa >= 80 ? 'text-active-dark' :
                            taxa >= 60 ? 'text-warn-dark'   :
                            'text-danger',
                          )}>
                            {taxa}%
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Shell>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function PresencaCell({ presenca }: { presenca: Presenca }) {
  if (presenca === 'presente') {
    return (
      <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-active-light border border-active/20">
        <CheckCircle2 size={12} className="text-active-dark" />
      </span>
    )
  }
  if (presenca === 'ausente') {
    return (
      <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-danger-light border border-danger/20">
        <XCircle size={12} className="text-danger" />
      </span>
    )
  }
  if (presenca === 'dispensado') {
    return (
      <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-surface-hover border border-surface-border">
        <Clock size={11} className="text-ink-muted" />
      </span>
    )
  }
  return (
    <span className="inline-flex items-center justify-center h-6 w-6">
      <span className="h-1 w-4 rounded-full bg-surface-border" />
    </span>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className={cn('inline-flex items-center justify-center h-5 w-5 rounded text-2xs font-bold border', color)}>
        {label}
      </span>
      <span className="text-2xs">
        {label === 'P' ? 'Presente' : label === 'A' ? 'Ausente' : 'Dispensado'}
      </span>
    </div>
  )
}

function FilterSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-9 pl-7 pr-7 text-xs font-medium rounded-md appearance-none',
          'border border-surface-border bg-surface-card text-ink-secondary',
          'focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600',
          'transition-colors duration-150 cursor-pointer',
        )}
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
      <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2 3.5L5 6.5L8 3.5" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </div>
  )
}

const inputCls = cn(
  'w-full h-9 pl-9 pr-3 text-sm',
  'bg-surface-card border border-surface-border rounded-md',
  'text-ink-primary placeholder:text-ink-muted',
  'focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600',
  'transition-colors duration-150',
)
