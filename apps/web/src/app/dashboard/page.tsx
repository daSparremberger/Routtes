import type { Metadata } from 'next'
import { Shell } from '@/components/layout/shell'
import {
  Button, Badge, Card, CardHeader, StatCard,
  Progress, ProgressRing, Separator,
} from '@/components/ui'
import {
  Users, Truck, Play, AlertTriangle, MapPin, Clock,
  CheckCircle2, XCircle, TrendingUp, Plus, Radio,
  ArrowUpRight, BarChart3, Navigation, Activity,
} from 'lucide-react'
import { formatTime } from '@/lib/utils'

export const metadata: Metadata = { title: 'Dashboard' }

// ─── Mock data — será substituído por TanStack Query ─────────────────────────

const stats = [
  {
    label:   'Rotas Hoje',
    value:   '12',
    icon:    <Play size={18} />,
    iconBg:  'active' as const,
    change:  { value: '2 a mais que ontem', positive: true },
  },
  {
    label:   'Alunos Ativos',
    value:   '284',
    icon:    <Users size={18} />,
    iconBg:  'brand' as const,
  },
  {
    label:   'Em Campo',
    value:   '8',
    icon:    <Truck size={18} />,
    iconBg:  'brand' as const,
    change:  { value: 'de 10 escalados', positive: false },
  },
  {
    label:   'Alertas',
    value:   '3',
    icon:    <AlertTriangle size={18} />,
    iconBg:  'warn' as const,
  },
]

const executions = [
  {
    id:              'ex-1',
    route:           'Rota Jardim América',
    driver:          'Carlos Silva',
    vehicle:         'ABC-1234',
    status:          'running' as const,
    studentsBoarded: 14,
    studentsTotal:   16,
    startedAt:       new Date(Date.now() - 25 * 60000).toISOString(),
    currentStop:     'Rua das Flores, 45',
  },
  {
    id:              'ex-2',
    route:           'Rota Centro',
    driver:          'Maria Santos',
    vehicle:         'DEF-5678',
    status:          'running' as const,
    studentsBoarded: 9,
    studentsTotal:   12,
    startedAt:       new Date(Date.now() - 42 * 60000).toISOString(),
    currentStop:     'Av. Brasil, 200',
  },
  {
    id:              'ex-3',
    route:           'Rota Vila Nova',
    driver:          'José Oliveira',
    vehicle:         'GHI-9012',
    status:          'completed' as const,
    studentsBoarded: 11,
    studentsTotal:   11,
    startedAt:       new Date(Date.now() - 95 * 60000).toISOString(),
    currentStop:     null,
  },
  {
    id:              'ex-4',
    route:           'Rota Planalto',
    driver:          'Pedro Costa',
    vehicle:         'JKL-3456',
    status:          'delayed' as const,
    studentsBoarded: 6,
    studentsTotal:   14,
    startedAt:       new Date(Date.now() - 15 * 60000).toISOString(),
    currentStop:     'Praça Central',
  },
]

const alerts = [
  { id: 1, type: 'delay',   message: 'Rota Planalto com atraso de 18 min', time: '14:32' },
  { id: 2, type: 'event',   message: 'Avaria reportada — Veículo GHI-9012', time: '13:55' },
  { id: 3, type: 'absence', message: '3 alunos ausentes na Rota Centro',   time: '13:20' },
]

// Semana (últimos 7 dias) — barras do mini chart
const weekData = [
  { day: 'Seg', routes: 10, color: 'bg-brand-600/60' },
  { day: 'Ter', routes: 12, color: 'bg-brand-600/60' },
  { day: 'Qua', routes: 9,  color: 'bg-brand-600/60' },
  { day: 'Qui', routes: 14, color: 'bg-brand-600/60' },
  { day: 'Sex', routes: 12, color: 'bg-brand-600' },   // hoje = destaque
  { day: 'Sáb', routes: 5,  color: 'bg-surface-border' },
  { day: 'Dom', routes: 0,  color: 'bg-surface-border' },
]
const maxRoutes = Math.max(...weekData.map((d) => d.routes))

// Motoristas ativos
const activeDrivers = [
  { name: 'Carlos Silva',  vehicle: 'ABC-1234', progress: 87, status: 'running' as const },
  { name: 'Maria Santos',  vehicle: 'DEF-5678', progress: 75, status: 'running' as const },
  { name: 'Pedro Costa',   vehicle: 'JKL-3456', progress: 43, status: 'delayed' as const },
  { name: 'José Oliveira', vehicle: 'GHI-9012', progress: 100, status: 'completed' as const },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const now       = new Date()
  const hour      = now.getHours()
  const greeting  = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const dateLabel = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <Shell
      title="Dashboard"
      subtitle={`${greeting} — ${dateLabel}`}
      headerActions={
        <Button size="sm" icon={<Plus size={14} />}>
          Nova Rota
        </Button>
      }
    >
      <div className="space-y-6 animate-fade-in">

        {/* ── KPI Stats ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="animate-slide-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <StatCard {...stat} />
            </div>
          ))}
        </div>

        {/* ── Main Grid ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Left col (2/3) */}
          <div className="xl:col-span-2 space-y-5">

            {/* Live status bar */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-active-light border border-active/20">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full rounded-full bg-active opacity-70 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-active" />
              </span>
              <p className="text-sm font-medium text-active-dark flex-1">
                3 rotas em andamento agora
              </p>
              <Button variant="ghost" size="sm" icon={<Radio size={12} />}>
                Ver mapa ao vivo
              </Button>
            </div>

            {/* Execuções ativas */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-section-title">Execuções do Dia</h2>
                <Button variant="ghost" size="sm" icon={<ArrowUpRight size={13} />} iconPosition="right">
                  Ver todas
                </Button>
              </div>
              <div className="space-y-2.5">
                {executions.map((exec, i) => (
                  <div
                    key={exec.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${(i + 4) * 40}ms` }}
                  >
                    <ExecutionCard exec={exec} />
                  </div>
                ))}
              </div>
            </div>

            {/* Motoristas em campo */}
            <Card>
              <CardHeader
                title="Motoristas em Campo"
                action={
                  <Badge variant="brand">
                    {activeDrivers.filter((d) => d.status === 'running').length} ativos
                  </Badge>
                }
              />
              <div className="space-y-4">
                {activeDrivers.map((driver) => (
                  <DriverRow key={driver.name} driver={driver} />
                ))}
              </div>
            </Card>
          </div>

          {/* Right col (1/3) */}
          <div className="space-y-4">

            {/* Alertas */}
            <Card>
              <CardHeader
                title="Alertas"
                action={
                  <Badge variant="warn" dot>
                    {alerts.length}
                  </Badge>
                }
              />
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <AlertItem key={alert.id} alert={alert} />
                ))}
              </div>
            </Card>

            {/* Resumo + Ring */}
            <Card>
              <CardHeader title="Resumo do Dia" />
              <div className="flex items-center gap-4">
                <ProgressRing
                  value={33}
                  size={72}
                  stroke={6}
                  variant="brand"
                  label={
                    <div className="text-center">
                      <p className="text-lg font-bold text-ink-primary tabular-nums leading-none">4</p>
                      <p className="text-2xs text-ink-muted">de 12</p>
                    </div>
                  }
                />
                <div className="flex-1 space-y-2.5">
                  <SummaryRow
                    label="Concluídas"
                    value="4"
                    icon={<CheckCircle2 size={13} className="text-active" />}
                  />
                  <SummaryRow
                    label="Em execução"
                    value="3"
                    icon={<Play size={13} className="text-brand-600" />}
                  />
                  <SummaryRow
                    label="Canceladas"
                    value="0"
                    icon={<XCircle size={13} className="text-danger" />}
                  />
                  <SummaryRow
                    label="Presença"
                    value="94,2%"
                    icon={<TrendingUp size={13} className="text-active" />}
                  />
                </div>
              </div>
            </Card>

            {/* Mini gráfico da semana */}
            <Card>
              <CardHeader
                title="Rotas da Semana"
                action={
                  <button className="text-2xs text-ink-muted hover:text-ink-primary transition-colors flex items-center gap-1">
                    <BarChart3 size={11} />
                    Detalhes
                  </button>
                }
              />
              <div className="flex items-end gap-1.5 h-16">
                {weekData.map((d) => (
                  <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="w-full flex flex-col justify-end" style={{ height: '44px' }}>
                      <div
                        className={`w-full rounded-sm transition-all duration-500 ${d.color}`}
                        style={{ height: `${maxRoutes > 0 ? (d.routes / maxRoutes) * 44 : 0}px` }}
                        title={`${d.routes} rotas`}
                      />
                    </div>
                    <span className="text-2xs text-ink-muted font-medium">{d.day}</span>
                  </div>
                ))}
              </div>
              <Separator className="mt-4 mb-3" />
              <div className="flex justify-between text-xs">
                <span className="text-ink-muted">Total semana</span>
                <span className="font-semibold text-ink-primary tabular-nums">
                  {weekData.reduce((a, d) => a + d.routes, 0)} rotas
                </span>
              </div>
            </Card>

            {/* Mapa ao vivo (placeholder) */}
            <div className="relative rounded-lg overflow-hidden bg-shell-900 border border-shell-800 aspect-[4/3]">
              {/* Simulated map grid */}
              <div className="absolute inset-0 opacity-10">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
                      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#60A5FA" strokeWidth="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>

              {/* Fake route lines */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 150" preserveAspectRatio="none">
                <path
                  d="M 20 130 Q 60 80 100 60 Q 140 40 180 20"
                  fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round"
                  strokeDasharray="4 2" opacity="0.8"
                />
                <path
                  d="M 30 140 Q 80 110 120 90 Q 160 70 190 50"
                  fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"
                  opacity="0.6"
                />
                {/* Vehicle dots */}
                <circle cx="80" cy="95" r="4" fill="#10B981" opacity="0.9"/>
                <circle cx="80" cy="95" r="7" fill="#10B981" opacity="0.25"/>
                <circle cx="130" cy="75" r="4" fill="#2563EB" opacity="0.9"/>
                <circle cx="130" cy="75" r="7" fill="#2563EB" opacity="0.25"/>
              </svg>

              {/* Overlay label */}
              <div className="absolute bottom-3 left-3 right-3">
                <div className="glass-dark rounded-md px-3 py-2 flex items-center gap-2">
                  <Navigation size={12} className="text-brand-400 shrink-0" />
                  <span className="text-xs font-medium text-ink-inverted">Rastreamento ao vivo</span>
                  <span className="ml-auto flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-active animate-pulse" />
                    <span className="text-2xs text-active font-medium">AO VIVO</span>
                  </span>
                </div>
              </div>

              {/* Top overlay */}
              <div className="absolute top-3 left-3 right-3 flex items-center gap-2">
                <div className="glass-dark rounded-md px-2.5 py-1.5 text-xs text-ink-inverted flex items-center gap-1.5">
                  <Activity size={11} className="text-active" />
                  2 veículos rastreados
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Shell>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

type ExecutionStatus = 'running' | 'completed' | 'delayed' | 'cancelled'

const statusConfig: Record<ExecutionStatus, {
  badge: React.ComponentProps<typeof Badge>['variant']
  label: string
  dot:   boolean
  progress: 'active' | 'brand' | 'warn' | 'danger'
}> = {
  running:   { badge: 'active',  label: 'Em andamento', dot: true,  progress: 'active' },
  completed: { badge: 'neutral', label: 'Concluída',    dot: false, progress: 'active' },
  delayed:   { badge: 'warn',    label: 'Atrasada',     dot: true,  progress: 'warn'   },
  cancelled: { badge: 'danger',  label: 'Cancelada',    dot: false, progress: 'danger' },
}

function ExecutionCard({ exec }: { exec: (typeof executions)[0] }) {
  const config  = statusConfig[exec.status]
  const elapsed = Math.floor((Date.now() - new Date(exec.startedAt).getTime()) / 60000)
  const pct     = Math.round((exec.studentsBoarded / exec.studentsTotal) * 100)

  return (
    <Card className="card-interactive group">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-ink-primary">{exec.route}</span>
            <Badge variant={config.badge} dot={config.dot}>
              {config.label}
            </Badge>
          </div>

          <div className="flex items-center gap-3 text-xs text-ink-muted mt-1">
            <span className="flex items-center gap-1">
              <Truck size={11} />
              {exec.driver}
            </span>
            <span className="font-mono text-2xs">{exec.vehicle}</span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {elapsed}min
            </span>
          </div>

          {exec.currentStop && (
            <div className="flex items-center gap-1 mt-2 text-xs text-ink-secondary">
              <MapPin size={11} className="text-brand-600 shrink-0" />
              <span className="truncate">{exec.currentStop}</span>
            </div>
          )}

          <div className="mt-3">
            <Progress value={pct} variant={config.progress} size="xs" />
          </div>
        </div>

        {/* Students counter */}
        <div className="shrink-0 text-right">
          <p className="text-xl font-semibold tabular-nums text-ink-primary leading-none">
            {exec.studentsBoarded}
            <span className="text-sm font-normal text-ink-muted">/{exec.studentsTotal}</span>
          </p>
          <p className="text-2xs text-ink-muted mt-0.5">alunos</p>
          <p className="text-2xs font-medium text-ink-secondary mt-1 tabular-nums">{pct}%</p>
        </div>
      </div>
    </Card>
  )
}

function DriverRow({ driver }: { driver: (typeof activeDrivers)[0] }) {
  const progressVariant =
    driver.status === 'completed' ? 'active' :
    driver.status === 'delayed'   ? 'warn'   : 'brand'

  return (
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 shrink-0 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center">
        <Truck size={14} className="text-brand-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-ink-primary truncate">{driver.name}</p>
          <span className="text-2xs text-ink-muted font-mono ml-2 shrink-0">{driver.vehicle}</span>
        </div>
        <Progress value={driver.progress} variant={progressVariant} size="xs" />
      </div>
      <span className="text-xs font-semibold tabular-nums text-ink-secondary w-8 text-right shrink-0">
        {driver.progress}%
      </span>
    </div>
  )
}

function AlertItem({ alert }: { alert: (typeof alerts)[0] }) {
  const cfg = {
    delay:   { bg: 'bg-warn-light',    icon: 'text-warn-dark',  border: 'border-warn/20' },
    event:   { bg: 'bg-danger-light',  icon: 'text-danger',     border: 'border-danger/20' },
    absence: { bg: 'bg-brand-50',      icon: 'text-brand-600',  border: 'border-brand-200' },
  }[alert.type] ?? { bg: 'bg-surface-hover', icon: 'text-ink-muted', border: 'border-surface-border' }

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 ${cfg.bg} ${cfg.border}`}>
      <div className={`mt-0.5 shrink-0 ${cfg.icon}`}>
        <AlertTriangle size={13} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink-primary leading-snug">{alert.message}</p>
        <p className="text-2xs text-ink-muted mt-0.5">{alert.time}</p>
      </div>
    </div>
  )
}

function SummaryRow({
  label, value, icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs text-ink-secondary">
        {icon}
        {label}
      </div>
      <span className="text-sm font-semibold text-ink-primary tabular-nums">{value}</span>
    </div>
  )
}
