'use client'

import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { motion } from 'motion/react'
import { Car, GraduationCap, Route, Truck } from 'lucide-react'
import { useShellConfig } from '@/components/layout/shell-context'
import { useDashboardStats } from '@/hooks/use-dashboard-stats'
import { useDrivers } from '@/hooks/use-drivers'
import { useRoutes } from '@/hooks/use-routes'
import { useVehicles } from '@/hooks/use-vehicles'

const SETUP_TASKS = [
  { step: '01', label: 'Cadastrar primeira escola', desc: 'Adicione as escolas atendidas pela operacao.' },
  { step: '02', label: 'Convidar motoristas', desc: 'Envie convites para os motoristas do time.' },
  { step: '03', label: 'Adicionar veiculos', desc: 'Registre os veiculos da frota.' },
  { step: '04', label: 'Criar primeira rota', desc: 'Monte a rota com os alunos e paradas.' },
]

export default function DashboardPage() {
  useShellConfig({ title: 'Dashboard' })
  const stats = useDashboardStats()
  const routes = useRoutes()
  const drivers = useDrivers({})
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
      <div className="grid h-full min-h-0 grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="flex min-h-[520px] flex-col p-4 xl:col-span-8">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-sm text-ink-muted">
                {greeting} • {dateLabel}
              </p>
              <h2 className="max-w-[520px] text-[30px] font-semibold leading-[1.02] tracking-[-0.04em] text-ink-primary">
                {hasData
                  ? 'Bem-vindo ao painel operacional da Routtes.'
                  : 'Configure sua operacao para comecar a gerenciar multiplas rotas com clareza.'}
              </h2>
            </div>
            {!hasData ? (
              <button className="h-11 shrink-0 rounded-[16px] bg-brand-500 px-5 font-medium text-ink-inverted transition-colors hover:bg-brand-600">
                Comecar
              </button>
            ) : null}
          </div>

          {hasData ? (
            <div className="flex-1 overflow-auto">
              <div className="mb-3 border-b border-white/[0.05] pb-3">
                <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">Rotas cadastradas</p>
              </div>

              {routes.isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="skeleton h-16 rounded-[18px]" />
                  ))}
                </div>
              ) : routes.data?.length === 0 ? (
                <div className="flex h-32 items-center justify-center rounded-[22px] text-sm text-ink-muted">
                  Nenhuma rota cadastrada ainda.
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {routes.data?.slice(0, 6).map((route) => (
                    <motion.div
                      key={route.id}
                      whileHover={{ y: -1 }}
                      className="flex items-center justify-between rounded-[18px] px-4 py-4 transition-colors hover:bg-white/[0.03]"
                    >
                      <div>
                        <p className="font-medium text-ink-primary">{route.name}</p>
                        <p className="mt-0.5 text-xs text-ink-muted">
                          {driverMap.get(route.driverId ?? '')?.name ?? 'Sem motorista'} • {vehicleMap.get(route.vehicleId ?? '')?.licensePlate ?? 'Sem veiculo'}
                        </p>
                      </div>
                      <span className="rounded-full bg-white/[0.05] px-3 py-1 text-xs text-ink-muted">
                        {route.status ?? 'rascunho'}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {SETUP_TASKS.map((task) => (
                <motion.div
                  key={task.step}
                  whileHover={{ y: -2, scale: 1.01 }}
                  className="rounded-[22px] px-2 py-5 transition-colors hover:bg-white/[0.03]"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[16px] bg-white/[0.05] text-sm font-semibold text-brand-500">
                    {task.step}
                  </div>
                  <h3 className="mb-2 text-lg font-medium text-ink-primary">{task.label}</h3>
                  <p className="text-sm text-ink-muted">{task.desc}</p>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-5 border-l border-white/[0.05] pl-6 xl:col-span-4">
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
            label="Veiculos"
            value={stats.isLoading ? '—' : String(stats.totalVehicles)}
            sub="na frota"
          />
        </aside>
      </div>
  )
}

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: ReactNode }) {
  return (
    <motion.div whileHover={{ y: -2 }} className="min-h-[150px] flex-1 px-1 py-4">
      <div className="mb-3 flex items-center justify-between border-b border-white/[0.05] pb-3">
        <p className="text-sm text-ink-muted">{label}</p>
        <span className="text-ink-muted/60">{icon}</span>
      </div>
      <h3 className="mb-1 text-[34px] font-semibold tracking-[-0.04em] text-ink-primary">{value}</h3>
      <p className="text-sm text-ink-muted">{sub}</p>
    </motion.div>
  )
}
