'use client'

import type { Metadata } from 'next'
import { Shell } from '@/components/layout/shell'
import { useDashboardStats } from '@/hooks/use-dashboard-stats'
import { useRoutes }  from '@/hooks/use-routes'
import { Users, Truck, Route, Car, GraduationCap } from 'lucide-react'
import { motion } from 'motion/react'

const SETUP_TASKS = [
  { step: '01', label: 'Cadastrar primeira escola',    desc: 'Adicione as escolas atendidas pela operação.' },
  { step: '02', label: 'Convidar motoristas',          desc: 'Envie convites para os motoristas do time.' },
  { step: '03', label: 'Adicionar veículos',           desc: 'Registre os veículos da frota.' },
  { step: '04', label: 'Criar primeira rota',          desc: 'Monte a rota com os alunos e paradas.' },
]

export default function DashboardPage() {
  const stats  = useDashboardStats()
  const routes = useRoutes()

  const now       = new Date()
  const hour      = now.getHours()
  const greeting  = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const dateLabel = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  const hasData = stats.totalStudents > 0 || stats.totalRoutes > 0

  return (
    <Shell title="Dashboard">
      <div className="grid grid-cols-12 gap-5 h-full min-h-0">

        {/* ── Left: setup card or summary ─────────────────────────────────── */}
        <div className="col-span-8 rounded-[28px] border border-white/6 bg-shell-600 p-6 flex flex-col">
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <p className="text-sm text-ink-muted mb-2">
                {greeting} — {dateLabel}
              </p>
              <h2 className="text-[30px] leading-[1.02] tracking-[-0.04em] font-semibold max-w-[520px] text-ink-primary">
                {hasData
                  ? 'Bem-vindo ao painel operacional da Routtes.'
                  : 'Configure sua operação para começar a gerenciar múltiplas rotas com clareza.'}
              </h2>
            </div>
            {!hasData && (
              <button className="h-11 px-5 rounded-[16px] bg-brand-500 text-ink-inverted font-medium hover:bg-brand-600 transition-colors shrink-0">
                Começar
              </button>
            )}
          </div>

          {hasData ? (
            /* Summary of recent routes */
            <div className="flex-1 overflow-auto space-y-3">
              <p className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-4">Rotas cadastradas</p>
              {routes.isLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map((i) => (
                    <div key={i} className="h-16 rounded-[18px] skeleton" />
                  ))}
                </div>
              ) : routes.data?.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-white/10 flex items-center justify-center h-32 text-ink-muted text-sm">
                  Nenhuma rota cadastrada ainda.
                </div>
              ) : (
                routes.data?.slice(0, 6).map((route) => (
                  <motion.div
                    key={route.id}
                    whileHover={{ y: -1 }}
                    className="rounded-[18px] border border-white/6 bg-white/[0.03] px-5 py-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-ink-primary">{route.name}</p>
                      <p className="text-xs text-ink-muted mt-0.5">
                        {route.driver?.name ?? 'Sem motorista'} · {route.vehicle?.licensePlate ?? 'Sem veículo'}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-white/7 text-xs text-ink-muted">
                      {route.status ?? 'rascunho'}
                    </span>
                  </motion.div>
                ))
              )}
            </div>
          ) : (
            /* Setup checklist */
            <div className="grid grid-cols-2 gap-4">
              {SETUP_TASKS.map((task) => (
                <motion.div
                  key={task.step}
                  whileHover={{ y: -2, scale: 1.01 }}
                  className="rounded-[22px] border border-white/6 bg-white/[0.03] p-5"
                >
                  <div className="h-11 w-11 rounded-[16px] bg-white/8 flex items-center justify-center mb-4 text-brand-500 font-semibold text-sm">
                    {task.step}
                  </div>
                  <h3 className="text-lg font-medium text-ink-primary mb-2">{task.label}</h3>
                  <p className="text-sm text-ink-muted">{task.desc}</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: stat cards ─────────────────────────────────────────────── */}
        <div className="col-span-4 flex flex-col gap-5">
          <StatCard
            icon={<Route size={18} strokeWidth={1.8} />}
            label="Rotas ativas"
            value={stats.isLoading ? '—' : String(stats.activeRoutes)}
            sub={`${stats.totalRoutes} no total`}
          />
          <StatCard
            icon={<GraduationCap size={18} strokeWidth={1.8} />}
            label="Alunos transportados"
            value={stats.isLoading ? '—' : String(stats.activeStudents)}
            sub={`${stats.totalStudents} cadastrados`}
          />
          <StatCard
            icon={<Truck size={18} strokeWidth={1.8} />}
            label="Motoristas ativos"
            value={stats.isLoading ? '—' : String(stats.onlineDrivers)}
            sub={`${stats.totalDrivers} no total`}
          />
          <StatCard
            icon={<Car size={18} strokeWidth={1.8} />}
            label="Veículos"
            value={stats.isLoading ? '—' : String(stats.totalVehicles)}
            sub="na frota"
          />
        </div>
      </div>
    </Shell>
  )
}

function StatCard({
  label, value, sub, icon,
}: {
  label: string
  value: string
  sub: string
  icon: React.ReactNode
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-[24px] border border-white/6 bg-shell-600 p-5 flex-1 min-h-0"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-ink-muted">{label}</p>
        <span className="text-ink-muted/60">{icon}</span>
      </div>
      <h3 className="text-[34px] tracking-[-0.04em] font-semibold mb-1 text-ink-primary">{value}</h3>
      <p className="text-sm text-ink-muted">{sub}</p>
    </motion.div>
  )
}
