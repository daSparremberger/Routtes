'use client'

import { useState } from 'react'
import { MasterDetail, DetailRow, type MasterItem } from '@/components/master-detail'
import {
  useTenants, useCreateTenant, useActivateTenant, useDeactivateTenant,
  type Tenant,
} from '@/hooks/admin/use-tenants'
import { Building2, MapPin, Calendar, Plus, Power, PowerOff } from 'lucide-react'

interface TenantItem extends MasterItem { _raw: Tenant }

function toItem(t: Tenant): TenantItem {
  return {
    id:           t.id,
    title:        t.name,
    subtitle:     `${t.city}, ${t.state}`,
    badge:        t.status === 'active' ? 'Ativo' : t.status === 'suspended' ? 'Suspenso' : 'Inativo',
    badgeVariant: t.status === 'active' ? 'active' : t.status === 'suspended' ? 'warn' : 'default',
    _raw:         t,
  }
}

export default function AdminTenantsPage() {
  const [search, setSearch]         = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm]             = useState({ name: '', city: '', state: '' })

  const { data, isLoading } = useTenants()
  const createMutation      = useCreateTenant()
  const activateMutation    = useActivateTenant()
  const deactivateMutation  = useDeactivateTenant()

  const items = (data ?? []).map(toItem)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    await createMutation.mutateAsync(form)
    setForm({ name: '', city: '', state: '' })
    setShowCreate(false)
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-primary tracking-[-0.02em]">Tenants</h1>
          <p className="text-sm text-ink-muted mt-0.5">{data?.length ?? 0} registros</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="h-10 px-4 rounded-[14px] bg-brand-500 text-ink-inverted font-medium text-sm hover:bg-brand-600 transition-colors flex items-center gap-2"
        >
          <Plus size={16} /> Novo Tenant
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-[20px] border border-white/8 bg-shell-600 p-5 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px] space-y-1">
            <label className="text-xs text-ink-muted">Nome</label>
            <input
              required value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full h-10 rounded-[12px] bg-white/6 border border-white/8 px-3 text-sm text-ink-primary outline-none focus:border-brand-500/50"
              placeholder="Prefeitura de Campinas"
            />
          </div>
          <div className="w-40 space-y-1">
            <label className="text-xs text-ink-muted">Cidade</label>
            <input
              required value={form.city}
              onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              className="w-full h-10 rounded-[12px] bg-white/6 border border-white/8 px-3 text-sm text-ink-primary outline-none focus:border-brand-500/50"
              placeholder="Campinas"
            />
          </div>
          <div className="w-20 space-y-1">
            <label className="text-xs text-ink-muted">UF</label>
            <input
              required maxLength={2} value={form.state}
              onChange={e => setForm(f => ({ ...f, state: e.target.value.toUpperCase() }))}
              className="w-full h-10 rounded-[12px] bg-white/6 border border-white/8 px-3 text-sm text-ink-primary outline-none focus:border-brand-500/50"
              placeholder="SP"
            />
          </div>
          <div className="flex gap-2">
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
          pageTitle="Tenants" newLabel="Novo Tenant"
          emptyText="Nenhum tenant cadastrado."
          onNew={() => setShowCreate(true)}
          renderDetail={(item) => {
            const t = item._raw
            return (
              <div className="space-y-4">
                <div className="space-y-3">
                  <DetailRow label="Nome"        value={t.name}                              icon={<Building2 size={16} />} />
                  <DetailRow label="Localização" value={`${t.city}, ${t.state}`}             icon={<MapPin size={16} />} />
                  <DetailRow label="Criado em"   value={new Date(t.created_at).toLocaleDateString('pt-BR')} icon={<Calendar size={16} />} />
                </div>
                <div className="pt-3 border-t border-white/6 flex gap-2">
                  {t.status !== 'active' ? (
                    <button onClick={() => activateMutation.mutate(t.id)} disabled={activateMutation.isPending}
                      className="flex-1 h-10 rounded-[12px] bg-green-500/15 text-green-400 text-sm font-medium hover:bg-green-500/25 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                      <Power size={15} /> Ativar
                    </button>
                  ) : (
                    <button onClick={() => deactivateMutation.mutate(t.id)} disabled={deactivateMutation.isPending}
                      className="flex-1 h-10 rounded-[12px] bg-red-500/12 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                      <PowerOff size={15} /> Desativar
                    </button>
                  )}
                </div>
              </div>
            )
          }}
        />
      </div>
    </div>
  )
}
