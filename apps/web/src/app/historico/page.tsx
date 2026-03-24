'use client'

import { useState, useMemo } from 'react'
import { Shell } from '@/components/layout/shell'
import {
  Button, Badge, Card, StatCard,
  EmptyState, Skeleton, Pagination,
} from '@/components/ui'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import {
  History, Search, Filter, Download,
  Calendar, CheckCircle2, XCircle, AlertTriangle,
  Clock, Truck, Users, Play, TrendingUp,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

// ─── Tipos ───────────────────────────────────────────────────────────────────

type StatusExecucao = 'completed' | 'delayed' | 'cancelled'

interface ExecucaoHistorico {
  id:              string
  data:            string
  rota:            string
  escola:          string
  turno:           string
  driver:          string
  vehicle:         string
  status:          StatusExecucao
  studentsBoarded: number
  studentsTotal:   number
  duracaoMin:      number
  delay?:          number
}

// ─── Mock data ─────────────────────────────────────────────────────────────

function pastDate(daysAgo: number, hour: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

const MOCK_HISTORICO: ExecucaoHistorico[] = [
  { id:'h1',  data:pastDate(0,8),  rota:'Rota Vila Nova',       escola:'E.E. Villa Nova',         turno:'Manhã',    driver:'José Oliveira',  vehicle:'GHI-9012', status:'completed', studentsBoarded:11, studentsTotal:11, duracaoMin:52  },
  { id:'h2',  data:pastDate(0,8),  rota:'Rota Jardim América',  escola:'E.M. João Pessoa',         turno:'Manhã',    driver:'Carlos Silva',   vehicle:'ABC-1234', status:'delayed',   studentsBoarded:14, studentsTotal:16, duracaoMin:70, delay:18 },
  { id:'h3',  data:pastDate(1,14), rota:'Rota Jardim América',  escola:'E.M. João Pessoa',         turno:'Tarde',    driver:'Carlos Silva',   vehicle:'ABC-1234', status:'completed', studentsBoarded:16, studentsTotal:16, duracaoMin:48  },
  { id:'h4',  data:pastDate(1,8),  rota:'Rota Centro',          escola:'E.M. João Pessoa',         turno:'Manhã',    driver:'Maria Santos',   vehicle:'DEF-5678', status:'completed', studentsBoarded:12, studentsTotal:12, duracaoMin:55  },
  { id:'h5',  data:pastDate(1,14), rota:'Rota Planalto',        escola:'E.M. João Pessoa',         turno:'Tarde',    driver:'Pedro Costa',    vehicle:'JKL-3456', status:'cancelled', studentsBoarded:0,  studentsTotal:14, duracaoMin:0   },
  { id:'h6',  data:pastDate(2,8),  rota:'Rota Vila Nova',       escola:'E.E. Villa Nova',          turno:'Manhã',    driver:'José Oliveira',  vehicle:'GHI-9012', status:'completed', studentsBoarded:10, studentsTotal:11, duracaoMin:50  },
  { id:'h7',  data:pastDate(2,14), rota:'Rota Centro',          escola:'E.M. João Pessoa',         turno:'Tarde',    driver:'Maria Santos',   vehicle:'DEF-5678', status:'completed', studentsBoarded:12, studentsTotal:12, duracaoMin:53  },
  { id:'h8',  data:pastDate(3,8),  rota:'Rota Jardim América',  escola:'E.M. João Pessoa',         turno:'Manhã',    driver:'Carlos Silva',   vehicle:'ABC-1234', status:'completed', studentsBoarded:16, studentsTotal:16, duracaoMin:47  },
  { id:'h9',  data:pastDate(3,8),  rota:'Rota CEI',             escola:'C.E.I. Pequenos Passos',   turno:'Integral', driver:'Fernanda Cruz',  vehicle:'MNO-7890', status:'delayed',   studentsBoarded:20, studentsTotal:22, duracaoMin:80, delay:22 },
  { id:'h10', data:pastDate(4,8),  rota:'Rota Vila Nova',       escola:'E.E. Villa Nova',          turno:'Manhã',    driver:'José Oliveira',  vehicle:'GHI-9012', status:'completed', studentsBoarded:11, studentsTotal:11, duracaoMin:51  },
  { id:'h11', data:pastDate(4,14), rota:'Rota Planalto',        escola:'E.M. João Pessoa',         turno:'Tarde',    driver:'Pedro Costa',    vehicle:'JKL-3456', status:'completed', studentsBoarded:14, studentsTotal:14, duracaoMin:62  },
  { id:'h12', data:pastDate(5,8),  rota:'Rota Centro',          escola:'E.M. João Pessoa',         turno:'Manhã',    driver:'Maria Santos',   vehicle:'DEF-5678', status:'completed', studentsBoarded:11, studentsTotal:12, duracaoMin:57  },
]

const STATUSES = ['Todos', 'Concluída', 'Atrasada', 'Cancelada']
const PER_PAGE = 10

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HistoricoPage() {
  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('Todos')
  const [page,         setPage]         = useState(1)
  const [loading]                       = useState(false)

  const filtered = useMemo(() => {
    return MOCK_HISTORICO.filter((e) => {
      const matchSearch = !search ||
        e.rota.toLowerCase().includes(search.toLowerCase()) ||
        e.driver.toLowerCase().includes(search.toLowerCase()) ||
        e.vehicle.includes(search.toUpperCase())
      const matchStatus = filterStatus === 'Todos' ||
        (filterStatus === 'Concluída' && e.status === 'completed') ||
        (filterStatus === 'Atrasada'  && e.status === 'delayed')   ||
        (filterStatus === 'Cancelada' && e.status === 'cancelled')
      return matchSearch && matchStatus
    })
  }, [search, filterStatus])

  const completed = MOCK_HISTORICO.filter((e) => e.status === 'completed').length
  const delayed   = MOCK_HISTORICO.filter((e) => e.status === 'delayed').length
  const cancelled = MOCK_HISTORICO.filter((e) => e.status === 'cancelled').length
  const totalStudents = MOCK_HISTORICO.reduce((s, e) => s + e.studentsBoarded, 0)

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const hasFilters = search || filterStatus !== 'Todos'

  return (
    <Shell
      title="Histórico"
      subtitle="Execuções dos últimos 30 dias"
      headerActions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Calendar size={14} />}>Período</Button>
          <Button variant="secondary" size="sm" icon={<Download  size={14} />}>Exportar</Button>
        </div>
      }
    >
      <div className="space-y-5 animate-fade-in">

        {/* ── KPIs ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Total de execuções"
            value={MOCK_HISTORICO.length}
            icon={<Play size={18} />}
            iconBg="brand"
          />
          <StatCard
            label="Concluídas"
            value={completed}
            icon={<CheckCircle2 size={18} />}
            iconBg="active"
            change={{ value: `${Math.round((completed/MOCK_HISTORICO.length)*100)}% do total`, positive: true }}
          />
          <StatCard
            label="Com atraso"
            value={delayed}
            icon={<AlertTriangle size={18} />}
            iconBg="warn"
          />
          <StatCard
            label="Alunos transportados"
            value={totalStudents}
            icon={<Users size={18} />}
            iconBg="brand"
          />
        </div>

        {/* ── Filtros ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 min-w-0 sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar rota, motorista ou placa…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className={inputCls}
            />
          </div>
          <div className="flex items-center gap-2">
            <FilterSelect value={filterStatus} options={STATUSES} onChange={(v) => { setFilterStatus(v); setPage(1) }} />
            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setFilterStatus('Todos'); setPage(1) }}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>
          <div className="sm:ml-auto shrink-0">
            <span className="text-xs text-ink-muted tabular-nums">
              {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* ── Tabela ────────────────────────────────────────────────────────── */}
        <Card flush>
          <Table>
            <TableHeader>
              <tr>
                <TableHead className="w-36">Data</TableHead>
                <TableHead className="w-[220px]">Rota</TableHead>
                <TableHead>Motorista</TableHead>
                <TableHead className="w-24 text-right">Alunos</TableHead>
                <TableHead className="w-24 text-right">Duração</TableHead>
                <TableHead className="w-24">Status</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}><Skeleton height={14} width={j === 0 ? '60%' : '50%'} /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paginated.length === 0 ? (
                <TableRow>
                  <td colSpan={6}>
                    <EmptyState
                      icon={<History size={22} />}
                      title={hasFilters ? 'Nenhum registro encontrado' : 'Nenhum histórico disponível'}
                      description={hasFilters ? 'Tente ajustar os filtros.' : 'O histórico de execuções aparecerá aqui.'}
                    />
                  </td>
                </TableRow>
              ) : (
                paginated.map((exec) => (
                  <HistoricoRow key={exec.id} exec={exec} />
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {filtered.length > PER_PAGE && (
          <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
        )}
      </div>
    </Shell>
  )
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function HistoricoRow({ exec }: { exec: ExecucaoHistorico }) {
  const d   = new Date(exec.data)
  const pct = exec.studentsTotal > 0
    ? Math.round((exec.studentsBoarded / exec.studentsTotal) * 100)
    : 0

  const statusCfg: Record<StatusExecucao, { label:string; badge: 'active'|'warn'|'danger'; dot:boolean }> = {
    completed: { label:'Concluída', badge:'active',  dot:false },
    delayed:   { label:'Atrasada',  badge:'warn',    dot:false },
    cancelled: { label:'Cancelada', badge:'danger',  dot:false },
  }
  const cfg = statusCfg[exec.status]

  return (
    <TableRow className="group">
      {/* Data */}
      <TableCell>
        <div>
          <p className="text-sm font-medium text-ink-primary tabular-nums">
            {d.toLocaleDateString('pt-BR', { day:'2-digit', month:'short' })}
          </p>
          <p className="text-2xs text-ink-muted">
            {d.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}
          </p>
        </div>
      </TableCell>

      {/* Rota */}
      <TableCell>
        <div>
          <p className="text-sm font-medium text-ink-primary truncate">{exec.rota}</p>
          <p className="text-2xs text-ink-muted">{exec.escola} · {exec.turno}</p>
        </div>
      </TableCell>

      {/* Motorista */}
      <TableCell>
        <div>
          <p className="text-sm text-ink-secondary">{exec.driver}</p>
          <p className="text-2xs font-mono text-ink-muted">{exec.vehicle}</p>
        </div>
      </TableCell>

      {/* Alunos */}
      <TableCell>
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums text-ink-primary">
            {exec.studentsBoarded}
            <span className="text-ink-muted font-normal">/{exec.studentsTotal}</span>
          </p>
          <p className={cn(
            'text-2xs tabular-nums',
            pct === 100 ? 'text-active-dark' :
            pct >= 80   ? 'text-ink-muted'   :
            'text-danger',
          )}>
            {pct}%
          </p>
        </div>
      </TableCell>

      {/* Duração */}
      <TableCell>
        <div className="flex items-center justify-end gap-1 text-sm text-ink-secondary">
          {exec.duracaoMin > 0 ? (
            <>
              <Clock size={11} className="text-ink-muted" />
              <span className="tabular-nums">{exec.duracaoMin}min</span>
              {exec.delay && exec.delay > 0 && (
                <span className="text-2xs text-warn-dark ml-1">+{exec.delay}min</span>
              )}
            </>
          ) : (
            <span className="text-ink-muted">—</span>
          )}
        </div>
      </TableCell>

      {/* Status */}
      <TableCell>
        <Badge variant={cfg.badge}>{cfg.label}</Badge>
      </TableCell>
    </TableRow>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
