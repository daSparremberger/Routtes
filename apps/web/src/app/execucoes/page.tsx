'use client'

import { useState, useMemo } from 'react'
import { Shell } from '@/components/layout/shell'
import {
  Button, Badge, Card, CardHeader, StatCard,
  EmptyState, Skeleton, Progress, Pagination,
} from '@/components/ui'
import {
  Search, Filter, Play, Clock, Truck,
  MapPin, Users, CheckCircle2, XCircle,
  AlertTriangle, Radio, Calendar, ArrowUpRight,
  MoreHorizontal,
} from 'lucide-react'
import { cn, formatDate, formatTime } from '@/lib/utils'

// ─── Tipos ───────────────────────────────────────────────────────────────────

type StatusExecucao = 'running' | 'completed' | 'delayed' | 'cancelled'

interface Execucao {
  id:              string
  rota:            string
  escola:          string
  turno:           string
  driver:          string
  vehicle:         string
  status:          StatusExecucao
  studentsBoarded: number
  studentsTotal:   number
  startedAt:       string
  finishedAt?:     string
  currentStop?:    string
  delay?:          number // minutos
  data:            string
}

// ─── Mock data ─────────────────────────────────────────────────────────────

const hoje = new Date().toISOString().slice(0, 10)

const MOCK_EXECUCOES: Execucao[] = [
  {
    id:'ex-1', rota:'Rota Jardim América', escola:'E.M. João Pessoa', turno:'Manhã',
    driver:'Carlos Silva', vehicle:'ABC-1234', status:'running',
    studentsBoarded:14, studentsTotal:16,
    startedAt:new Date(Date.now() - 25 * 60000).toISOString(),
    currentStop:'Rua das Flores, 45', data:hoje,
  },
  {
    id:'ex-2', rota:'Rota Centro', escola:'E.M. João Pessoa', turno:'Tarde',
    driver:'Maria Santos', vehicle:'DEF-5678', status:'running',
    studentsBoarded:9, studentsTotal:12,
    startedAt:new Date(Date.now() - 42 * 60000).toISOString(),
    currentStop:'Av. Brasil, 200', data:hoje,
  },
  {
    id:'ex-3', rota:'Rota Vila Nova', escola:'E.E. Villa Nova', turno:'Manhã',
    driver:'José Oliveira', vehicle:'GHI-9012', status:'completed',
    studentsBoarded:11, studentsTotal:11,
    startedAt:new Date(Date.now() - 95 * 60000).toISOString(),
    finishedAt:new Date(Date.now() - 10 * 60000).toISOString(),
    data:hoje,
  },
  {
    id:'ex-4', rota:'Rota Planalto', escola:'E.M. João Pessoa', turno:'Tarde',
    driver:'Pedro Costa', vehicle:'JKL-3456', status:'delayed',
    studentsBoarded:6, studentsTotal:14, delay:18,
    startedAt:new Date(Date.now() - 15 * 60000).toISOString(),
    currentStop:'Praça Central', data:hoje,
  },
  {
    id:'ex-5', rota:'Rota Jardim América', escola:'E.M. João Pessoa', turno:'Tarde',
    driver:'Carlos Silva', vehicle:'ABC-1234', status:'completed',
    studentsBoarded:16, studentsTotal:16,
    startedAt:new Date(Date.now() - 180 * 60000).toISOString(),
    finishedAt:new Date(Date.now() - 120 * 60000).toISOString(),
    data:hoje,
  },
  {
    id:'ex-6', rota:'Rota CEI Pequenos Passos', escola:'C.E.I. Pequenos Passos', turno:'Manhã',
    driver:'Fernanda Cruz', vehicle:'MNO-7890', status:'cancelled',
    studentsBoarded:0, studentsTotal:22,
    startedAt:new Date(Date.now() - 60 * 60000).toISOString(),
    data:hoje,
  },
]

const STATUSES = ['Todos', 'Em andamento', 'Concluída', 'Atrasada', 'Cancelada']
const PER_PAGE = 8

const statusConfig: Record<StatusExecucao, {
  label:    string
  badge:    'active' | 'brand' | 'warn' | 'neutral' | 'danger'
  dot:      boolean
  progress: 'active' | 'brand' | 'warn' | 'danger'
  icon:     React.ReactNode
}> = {
  running:   { label:'Em andamento', badge:'active',  dot:true,  progress:'active', icon:<Play       size={12} className="text-active"     /> },
  completed: { label:'Concluída',    badge:'neutral', dot:false, progress:'active', icon:<CheckCircle2 size={12} className="text-active"   /> },
  delayed:   { label:'Atrasada',     badge:'warn',    dot:true,  progress:'warn',   icon:<AlertTriangle size={12} className="text-warn"    /> },
  cancelled: { label:'Cancelada',    badge:'danger',  dot:false, progress:'danger', icon:<XCircle     size={12} className="text-danger"    /> },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExecucoesPage() {
  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('Todos')
  const [page,         setPage]         = useState(1)
  const [loading]                       = useState(false)

  const filtered = useMemo(() => {
    return MOCK_EXECUCOES.filter((e) => {
      const matchSearch = !search ||
        e.rota.toLowerCase().includes(search.toLowerCase()) ||
        e.driver.toLowerCase().includes(search.toLowerCase()) ||
        e.vehicle.includes(search.toUpperCase())
      const matchStatus = filterStatus === 'Todos' ||
        (filterStatus === 'Em andamento' && e.status === 'running')   ||
        (filterStatus === 'Concluída'    && e.status === 'completed') ||
        (filterStatus === 'Atrasada'     && e.status === 'delayed')   ||
        (filterStatus === 'Cancelada'    && e.status === 'cancelled')
      return matchSearch && matchStatus
    })
  }, [search, filterStatus])

  const running   = MOCK_EXECUCOES.filter((e) => e.status === 'running').length
  const completed = MOCK_EXECUCOES.filter((e) => e.status === 'completed').length
  const delayed   = MOCK_EXECUCOES.filter((e) => e.status === 'delayed').length
  const cancelled = MOCK_EXECUCOES.filter((e) => e.status === 'cancelled').length
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const hasFilters = search || filterStatus !== 'Todos'

  return (
    <Shell
      title="Execuções"
      subtitle={`Hoje — ${new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' })}`}
      headerActions={
        <Button variant="secondary" size="sm" icon={<Calendar size={14} />}>
          Escolher data
        </Button>
      }
    >
      <div className="space-y-5 animate-fade-in">

        {/* ── Live status bar ───────────────────────────────────────────────── */}
        {running > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-active-light border border-active/20">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full rounded-full bg-active opacity-70 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-active" />
            </span>
            <p className="text-sm font-medium text-active-dark flex-1">
              {running} rota{running !== 1 ? 's' : ''} em andamento agora
            </p>
            <Button variant="ghost" size="sm" icon={<Radio size={12} />}>
              Ver mapa ao vivo
            </Button>
          </div>
        )}

        {/* ── KPIs ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Em andamento" value={running}   iconBg="active"   icon={<Play          size={18} />} />
          <StatCard label="Concluídas"   value={completed} iconBg="neutral"  icon={<CheckCircle2  size={18} />} />
          <StatCard label="Atrasadas"    value={delayed}   iconBg="warn"     icon={<AlertTriangle size={18} />} />
          <StatCard label="Canceladas"   value={cancelled} iconBg="danger"   icon={<XCircle       size={18} />} />
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

          <div className="flex items-center gap-2 flex-wrap">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => { setFilterStatus(s); setPage(1) }}
                className={cn(
                  'h-9 px-3 text-xs font-medium rounded-md border transition-colors',
                  filterStatus === s
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-surface-card text-ink-secondary border-surface-border hover:border-brand-300 hover:text-brand-600',
                )}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="sm:ml-auto shrink-0">
            <span className="text-xs text-ink-muted tabular-nums">{filtered.length} execuç{filtered.length !== 1 ? 'ões' : 'ão'}</span>
          </div>
        </div>

        {/* ── Cards de execução ─────────────────────────────────────────────── */}
        {loading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><Skeleton height={80} /></Card>
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Play size={22} />}
              title={hasFilters ? 'Nenhuma execução encontrada' : 'Nenhuma execução hoje'}
              description={hasFilters ? 'Tente ajustar os filtros.' : 'Inicie uma rota para ver as execuções aqui.'}
            />
          </Card>
        ) : (
          <div className="space-y-2.5">
            {paginated.map((exec, i) => (
              <div key={exec.id} className="animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
                <ExecucaoCard exec={exec} />
              </div>
            ))}
          </div>
        )}

        {filtered.length > PER_PAGE && (
          <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
        )}
      </div>
    </Shell>
  )
}

// ─── Execução Card ────────────────────────────────────────────────────────────

function ExecucaoCard({ exec }: { exec: Execucao }) {
  const cfg     = statusConfig[exec.status]
  const elapsed = Math.floor((Date.now() - new Date(exec.startedAt).getTime()) / 60000)
  const pct     = Math.round((exec.studentsBoarded / exec.studentsTotal) * 100)

  return (
    <Card className="card-interactive group">
      <div className="flex items-start gap-4">

        {/* Status icon */}
        <div className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg mt-0.5',
          exec.status === 'running'   ? 'bg-active-light' :
          exec.status === 'completed' ? 'bg-surface-hover' :
          exec.status === 'delayed'   ? 'bg-warn-light'   :
          'bg-danger-light',
        )}>
          {cfg.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-ink-primary">{exec.rota}</span>
            <Badge variant={cfg.badge} dot={cfg.dot}>{cfg.label}</Badge>
            {exec.delay && exec.delay > 0 && (
              <span className="text-xs font-medium text-warn-dark">+{exec.delay}min</span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-ink-muted flex-wrap mb-2">
            <span className="flex items-center gap-1">
              <Truck size={11} />
              {exec.driver}
            </span>
            <span className="font-mono text-2xs">{exec.vehicle}</span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {exec.status === 'completed' && exec.finishedAt
                ? `${elapsed}min (concluída)`
                : `${elapsed}min em andamento`}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {exec.escola} · {exec.turno}
            </span>
          </div>

          {exec.currentStop && (
            <div className="flex items-center gap-1 mb-2 text-xs text-ink-secondary">
              <MapPin size={11} className="text-brand-600 shrink-0" />
              <span className="truncate">Parada atual: {exec.currentStop}</span>
            </div>
          )}

          {/* Progress */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Progress value={pct} variant={cfg.progress} size="xs" />
            </div>
            <div className="flex items-center gap-1 text-xs shrink-0">
              <Users size={11} className="text-ink-muted" />
              <span className="tabular-nums font-medium text-ink-primary">{exec.studentsBoarded}</span>
              <span className="text-ink-muted">/{exec.studentsTotal}</span>
              <span className="text-ink-muted ml-1">({pct}%)</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {exec.status === 'running' && (
          <div className="shrink-0 flex items-center gap-1">
            <Button variant="ghost" size="sm" icon={<ArrowUpRight size={13} />}>
              Detalhar
            </Button>
            <button className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-surface-hover transition-colors">
              <MoreHorizontal size={15} />
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls = cn(
  'w-full h-9 pl-9 pr-3 text-sm',
  'bg-surface-card border border-surface-border rounded-md',
  'text-ink-primary placeholder:text-ink-muted',
  'focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600',
  'transition-colors duration-150',
)
