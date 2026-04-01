'use client'

import { useAdminKpis, useCommercialKpis } from '@/hooks/admin/use-admin-dashboard'
import { Building2, FileText, AlertTriangle, DollarSign, Receipt, TrendingUp } from 'lucide-react'
import { motion } from 'motion/react'

export default function AdminDashboardPage() {
  const kpis       = useAdminKpis()
  const commercial = useCommercialKpis()

  const now       = new Date()
  const hour      = now.getHours()
  const greeting  = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const dateLabel = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-white/6 bg-shell-600 p-6">
        <p className="text-sm text-ink-muted mb-2">{greeting} — {dateLabel}</p>
        <h2 className="text-[28px] leading-[1.05] tracking-[-0.04em] font-semibold text-ink-primary">
          Painel de administração da plataforma.
        </h2>
      </div>

      <div>
        <p className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-3 px-1">Tenants</p>
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            icon={<Building2 size={18} strokeWidth={1.8} />}
            label="Tenants ativos"
            value={kpis.isLoading ? '—' : String(kpis.data?.tenantsActive ?? 0)}
            sub="na plataforma"
          />
          <StatCard
            icon={<TrendingUp size={18} strokeWidth={1.8} />}
            label="Novos (30 dias)"
            value={kpis.isLoading ? '—' : String(kpis.data?.tenantsNewLast30d ?? 0)}
            sub="cadastros recentes"
          />
          <StatCard
            icon={<AlertTriangle size={18} strokeWidth={1.8} />}
            label="Suspensos"
            value={kpis.isLoading ? '—' : String(kpis.data?.tenantsSuspended ?? 0)}
            sub="requerem atenção"
            warn={(kpis.data?.tenantsSuspended ?? 0) > 0}
          />
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-3 px-1">Comercial</p>
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            icon={<FileText size={18} strokeWidth={1.8} />}
            label="Contratos ativos"
            value={commercial.isLoading ? '—' : String(commercial.data?.activeContracts ?? 0)}
            sub="vigentes"
          />
          <StatCard
            icon={<DollarSign size={18} strokeWidth={1.8} />}
            label="Receita mensal"
            value={commercial.isLoading ? '—' : `R$ ${((commercial.data?.monthlyRevenue ?? 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            sub="contratos ativos"
          />
          <StatCard
            icon={<Receipt size={18} strokeWidth={1.8} />}
            label="Faturas pendentes"
            value={commercial.isLoading ? '—' : String(commercial.data?.pendingInvoices ?? 0)}
            sub="aguardando pagamento"
            warn={(commercial.data?.pendingInvoices ?? 0) > 0}
          />
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label, value, sub, icon, warn = false,
}: {
  label: string; value: string; sub: string; icon: React.ReactNode; warn?: boolean
}) {
  return (
    <motion.div whileHover={{ y: -2 }} className="rounded-[24px] border border-white/6 bg-shell-600 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-ink-muted">{label}</p>
        <span className={warn ? 'text-amber-400/80' : 'text-ink-muted/60'}>{icon}</span>
      </div>
      <h3 className={`text-[32px] tracking-[-0.04em] font-semibold mb-1 ${warn ? 'text-amber-400' : 'text-ink-primary'}`}>
        {value}
      </h3>
      <p className="text-sm text-ink-muted">{sub}</p>
    </motion.div>
  )
}
