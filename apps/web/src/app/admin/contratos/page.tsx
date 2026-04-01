'use client'

import { useState } from 'react'
import { MasterDetail, DetailRow, type MasterItem } from '@/components/master-detail'
import { useContracts, useCreateContract, useUpdateContractStatus, type Contract } from '@/hooks/admin/use-contracts'
import { useOrganizations } from '@/hooks/admin/use-organizations'
import { FileText, Building2, Calendar, DollarSign, Plus } from 'lucide-react'

interface ContractItem extends MasterItem { _raw: Contract }

const STATUS_LABEL: Record<string, string> = {
  active:    'Ativo',
  pending:   'Pendente',
  expired:   'Expirado',
  cancelled: 'Cancelado',
}
const STATUS_VARIANT: Record<string, 'active' | 'warn' | 'danger' | 'default'> = {
  active:    'active',
  pending:   'warn',
  expired:   'default',
  cancelled: 'danger',
}

function toItem(c: Contract): ContractItem {
  const orgName = c.organizations?.name ?? c.organization_id
  const value   = `R$ ${(c.monthly_value / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  return {
    id:           c.id,
    title:        orgName,
    subtitle:     value,
    badge:        STATUS_LABEL[c.status] ?? c.status,
    badgeVariant: STATUS_VARIANT[c.status] ?? 'default',
    _raw:         c,
  }
}

export default function AdminContratosPage() {
  const [search, setSearch]         = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm]             = useState({ organization_id: '', monthly_value: '', starts_at: '', ends_at: '' })

  const { data, isLoading }  = useContracts()
  const { data: orgs }       = useOrganizations()
  const createMutation       = useCreateContract()
  const statusMutation       = useUpdateContractStatus()

  const items = (data ?? []).map(toItem)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    await createMutation.mutateAsync({
      organization_id: form.organization_id,
      monthly_value:   Math.round(parseFloat(form.monthly_value) * 100),
      starts_at:       form.starts_at,
      ends_at:         form.ends_at || undefined,
    })
    setForm({ organization_id: '', monthly_value: '', starts_at: '', ends_at: '' })
    setShowCreate(false)
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-primary tracking-[-0.02em]">Contratos</h1>
          <p className="text-sm text-ink-muted mt-0.5">{data?.length ?? 0} registros</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="h-10 px-4 rounded-[14px] bg-brand-500 text-ink-inverted font-medium text-sm hover:bg-brand-600 transition-colors flex items-center gap-2">
          <Plus size={16} /> Novo Contrato
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-[20px] border border-white/8 bg-shell-600 p-5 grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <label className="text-xs text-ink-muted">Organização</label>
            <select required value={form.organization_id}
              onChange={e => setForm(f => ({ ...f, organization_id: e.target.value }))}
              className="w-full h-10 rounded-[12px] bg-white/6 border border-white/8 px-3 text-sm text-ink-primary outline-none focus:border-brand-500/50">
              <option value="">Selecionar...</option>
              {(orgs ?? []).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-ink-muted">Valor mensal (R$)</label>
            <input required type="number" min="0" step="0.01" value={form.monthly_value}
              onChange={e => setForm(f => ({ ...f, monthly_value: e.target.value }))}
              className="w-full h-10 rounded-[12px] bg-white/6 border border-white/8 px-3 text-sm text-ink-primary outline-none focus:border-brand-500/50"
              placeholder="1500.00" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-ink-muted">Início</label>
            <input required type="date" value={form.starts_at}
              onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
              className="w-full h-10 rounded-[12px] bg-white/6 border border-white/8 px-3 text-sm text-ink-primary outline-none focus:border-brand-500/50" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-ink-muted">Encerramento (opcional)</label>
            <input type="date" value={form.ends_at}
              onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
              className="w-full h-10 rounded-[12px] bg-white/6 border border-white/8 px-3 text-sm text-ink-primary outline-none focus:border-brand-500/50" />
          </div>
          <div className="col-span-2 flex gap-2 justify-end">
            <button type="submit" disabled={createMutation.isPending}
              className="h-10 px-4 rounded-[12px] bg-brand-500 text-ink-inverted font-medium text-sm disabled:opacity-60">
              {createMutation.isPending ? 'Criando…' : 'Criar'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)}
              className="h-10 px-4 rounded-[12px] bg-white/6 text-ink-muted text-sm hover:bg-white/10 transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="flex-1 min-h-0">
        <MasterDetail
          items={items} isLoading={isLoading} search={search}
          pageTitle="Contratos" newLabel="Novo Contrato"
          emptyText="Nenhum contrato cadastrado."
          onNew={() => setShowCreate(true)}
          renderDetail={(item) => {
            const c = item._raw
            const value = `R$ ${(c.monthly_value / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            return (
              <div className="space-y-4">
                <div className="space-y-3">
                  <DetailRow label="Organização" value={c.organizations?.name ?? c.organization_id} icon={<Building2 size={16} />} />
                  <DetailRow label="Valor mensal" value={value}                                       icon={<DollarSign size={16} />} />
                  <DetailRow label="Vigência"    value={`${new Date(c.starts_at).toLocaleDateString('pt-BR')}${c.ends_at ? ` → ${new Date(c.ends_at).toLocaleDateString('pt-BR')}` : ' (indeterminado)'}`} icon={<Calendar size={16} />} />
                  <DetailRow label="Status"      value={STATUS_LABEL[c.status] ?? c.status}           icon={<FileText size={16} />} />
                </div>
                {c.status === 'pending' && (
                  <div className="pt-3 border-t border-white/6 flex gap-2">
                    <button
                      onClick={() => statusMutation.mutate({ id: c.id, status: 'active' })}
                      disabled={statusMutation.isPending}
                      className="flex-1 h-10 rounded-[12px] bg-green-500/15 text-green-400 text-sm font-medium hover:bg-green-500/25 transition-colors disabled:opacity-60">
                      Ativar
                    </button>
                    <button
                      onClick={() => statusMutation.mutate({ id: c.id, status: 'cancelled' })}
                      disabled={statusMutation.isPending}
                      className="flex-1 h-10 rounded-[12px] bg-red-500/12 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-60">
                      Cancelar
                    </button>
                  </div>
                )}
                {c.status === 'active' && (
                  <div className="pt-3 border-t border-white/6">
                    <button
                      onClick={() => statusMutation.mutate({ id: c.id, status: 'cancelled' })}
                      disabled={statusMutation.isPending}
                      className="w-full h-10 rounded-[12px] bg-red-500/12 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-60">
                      Cancelar contrato
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
