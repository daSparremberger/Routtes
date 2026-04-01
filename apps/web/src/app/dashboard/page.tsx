'use client'

import type { ReactNode } from 'react'
import { Shell } from '@/components/layout/shell'
import { useDashboardStats } from '@/hooks/use-dashboard-stats'
import { useRoutes } from '@/hooks/use-routes'
import { useDrivers } from '@/hooks/use-drivers'
import { useVehicles } from '@/hooks/use-vehicles'
import { Truck, Route, Car, GraduationCap } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo } from 'react'

const SETUP_TASKS = [
  { step: '01', label: 'Cadastrar primeira escola', desc: 'Adicione as escolas atendidas pela operação.' },
  { step: '02', label: 'Convidar motoristas', desc: 'Envie convites para os motoristas do time.' },
  { step: '03', label: 'Adicionar veículos', desc: 'Registre os veículos da frota.' },
  { step: '04', label: 'Criar primeira rota', desc: 'Monte a rota com os alunos e paradas.' },
]

export default function DashboardPage() {
  const stats = useDashboardStats()
  const routes = useRoutes()
  const drivers = useDrivers()
  const vehicles = useVehicles()
  const driverMap = useMemo(
    () => new Map((drivers.data ?? []).map((driver) => [driver.id, driver])),
    [drivers.data],
  )
  const vehicleMap = useMemo(
    () => new Map((vehicles.data ?? []).map((vehicle) => [vehicle.id, vehicle])),
    [vehicles.data],
  )

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const dateLabel = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const hasData = stats.totalStudents > 0 || stats.totalRoutes > 0

  return (
    <Shell title="Dashboard">
      <div className="grid h-full min-h-0 grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="flex min-h-[520px] flex-col rounded-[28px] border border-white/6 bg-shell-600 p-6 xl:col-span-8">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-sm text-ink-muted">
                {greeting} • {dateLabel}
              </p>
              <h2 className="max-w-[520px] text-[30px] font-semibold leading-[1.02] tracking-[-0.04em] text-ink-primary">
                {hasData
                  ? 'Bem-vindo ao painel operacional da Routtes.'
                  : 'Configure sua operação para começar a gerenciar múltiplas rotas com clareza.'}
              </h2>
            </div>
            {!hasData && (
              <button className="h-11 shrink-0 rounded-[16px] bg-brand-500 px-5 font-medium text-ink-inverted transition-colors hover:bg-brand-600">
                Começar
              </button>
            )}
          </div>

          {hasData ? (
            <div className="flex-1 space-y-3 overflow-auto">
              <p className="mb-4 text-xs font-medium uppercase tracking-wider text-ink-muted">Rotas cadastradas</p>
              {routes.isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="skeleton h-16 rounded-[18px]" />
                  ))}
                </div>
              ) : routes.data?.length === 0 ? (
                <div className="flex h-32 items-center justify-center rounded-[22px] border border-dashed border-white/10 text-sm text-ink-muted">
                  Nenhuma rota cadastrada ainda.
                </div>
              ) : (
                routes.data?.slice(0, 6).map((route) => (
                  <motion.div
                    key={route.id}
                    whileHover={{ y: -1 }}
                    className="flex items-center justify-between rounded-[18px] border border-white/6 bg-white/[0.03] px-5 py-4"
                  >
                    <div>
                      <p className="font-medium text-ink-primary">{route.name}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {driverMap.get(route.driverId ?? '')?.name ?? 'Sem motorista'} • {vehicleMap.get(route.vehicleId ?? '')?.licensePlate ?? 'Sem veículo'}
                      </p>
                    </div>
                    <span className="rounded-full bg-white/7 px-3 py-1 text-xs text-ink-muted">
                      {route.status ?? 'rascunho'}
                    </span>
                  </motion.div>
                ))
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {SETUP_TASKS.map((task) => (
                <motion.div
                  key={task.step}
                  whileHover={{ y: -2, scale: 1.01 }}
                  className="rounded-[22px] border border-white/6 bg-white/[0.03] p-5"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[16px] bg-white/8 text-sm font-semibold text-brand-500">
                    {task.step}
                  </div>
                  <h3 className="mb-2 text-lg font-medium text-ink-primary">{task.label}</h3>
                  <p className="text-sm text-ink-muted">{task.desc}</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5 xl:col-span-4">
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

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: ReactNode }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="min-h-[150px] flex-1 rounded-[24px] border border-white/6 bg-shell-600 p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-ink-muted">{label}</p>
        <span className="text-ink-muted/60">{icon}</span>
      </div>
      <h3 className="mb-1 text-[34px] font-semibold tracking-[-0.04em] text-ink-primary">{value}</h3>
      <p className="text-sm text-ink-muted">{sub}</p>
    </motion.div>
  )
}
