'use client'

import { useState } from 'react'
import { MasterDetail, DetailRow, type MasterItem } from '@/components/master-detail'
import { useInvoices, useMarkInvoicePaid, useCancelInvoice, type Invoice } from '@/hooks/admin/use-invoices'
import { Receipt, Building2, Calendar, DollarSign, CheckCircle2 } from 'lucide-react'

interface InvoiceItem extends MasterItem { _raw: Invoice }

const STATUS_LABEL: Record<string, string> = {
  pending:   'Pendente',
  paid:      'Pago',
  cancelled: 'Cancelado',
  overdue:   'Vencido',
}
const STATUS_VARIANT: Record<string, 'active' | 'warn' | 'danger' | 'default'> = {
  pending:   'warn',
  paid:      'active',
  cancelled: 'default',
  overdue:   'danger',
}

function toItem(i: Invoice): InvoiceItem {
  const org   = i.contracts?.organizations?.name ?? i.contract_id
  const value = `R$ ${(i.amount / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  return {
    id:           i.id,
    title:        org,
    subtitle:     `${value} · vence ${new Date(i.due_date).toLocaleDateString('pt-BR')}`,
    badge:        STATUS_LABEL[i.status] ?? i.status,
    badgeVariant: STATUS_VARIANT[i.status] ?? 'default',
    _raw:         i,
  }
}

export default function AdminFaturasPage() {
  const [search, setSearch]           = useState('')
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined)

  const { data, isLoading } = useInvoices(filterStatus)
  const paidMutation        = useMarkInvoicePaid()
  const cancelMutation      = useCancelInvoice()

  const items = (data ?? []).map(toItem)

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-primary tracking-[-0.02em]">Faturas</h1>
          <p className="text-sm text-ink-muted mt-0.5">{data?.length ?? 0} registros</p>
        </div>
        {/* Status filter */}
        <div className="flex gap-2">
          {[
            { label: 'Todas', value: undefined },
            { label: 'Pendentes', value: 'pending' },
            { label: 'Pagas', value: 'paid' },
            { label: 'Vencidas', value: 'overdue' },
          ].map(opt => (
            <button
              key={String(opt.value)}
              onClick={() => setFilterStatus(opt.value)}
              className={`h-9 px-3 rounded-[12px] text-sm transition-colors ${
                filterStatus === opt.value
                  ? 'bg-brand-500 text-ink-inverted'
                  : 'bg-white/6 text-ink-muted hover:bg-white/10'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <MasterDetail
          items={items} isLoading={isLoading} search={search}
          pageTitle="Faturas" emptyText="Nenhuma fatura encontrada."
          renderDetail={(item) => {
            const inv = item._raw
            const value = `R$ ${(inv.amount / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            return (
              <div className="space-y-4">
                <div className="space-y-3">
                  <DetailRow label="Organização"  value={inv.contracts?.organizations?.name ?? inv.contract_id} icon={<Building2 size={16} />} />
                  <DetailRow label="Valor"         value={value}                                                  icon={<DollarSign size={16} />} />
                  <DetailRow label="Vencimento"    value={new Date(inv.due_date).toLocaleDateString('pt-BR')}    icon={<Calendar size={16} />} />
                  <DetailRow label="Status"        value={STATUS_LABEL[inv.status] ?? inv.status}                icon={<Receipt size={16} />} />
                  {inv.paid_at && (
                    <DetailRow label="Pago em" value={new Date(inv.paid_at).toLocaleDateString('pt-BR')} icon={<CheckCircle2 size={16} />} />
                  )}
                </div>
                {(inv.status === 'pending' || inv.status === 'overdue') && (
                  <div className="pt-3 border-t border-white/6 flex gap-2">
                    <button
                      onClick={() => paidMutation.mutate(inv.id)}
                      disabled={paidMutation.isPending}
                      className="flex-1 h-10 rounded-[12px] bg-green-500/15 text-green-400 text-sm font-medium hover:bg-green-500/25 transition-colors disabled:opacity-60"
                    >
                      {paidMutation.isPending ? 'Processando…' : 'Marcar como pago'}
                    </button>
                    <button
                      onClick={() => cancelMutation.mutate(inv.id)}
                      disabled={cancelMutation.isPending}
                      className="flex-1 h-10 rounded-[12px] bg-red-500/12 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-60"
                    >
                      {cancelMutation.isPending ? 'Cancelando…' : 'Cancelar'}
                    </button>
                  </div>
                )}
              </div>
            )
          }}
        />
      </div>
    </div>
  )
}
