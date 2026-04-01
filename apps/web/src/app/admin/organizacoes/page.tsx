'use client'

import { useState } from 'react'
import { MasterDetail, DetailRow, type MasterItem } from '@/components/master-detail'
import { useOrganizations, useCreateOrganization, useDeactivateOrganization, type Organization } from '@/hooks/admin/use-organizations'
import { useTenants } from '@/hooks/admin/use-tenants'
import { Briefcase, Building2, Calendar, Plus, PowerOff } from 'lucide-react'

interface OrgItem extends MasterItem { _raw: Organization }

function toItem(o: Organization): OrgItem {
  return {
    id:           o.id,
    title:        o.name,
    subtitle:     o.tenants?.name ?? o.tenant_id,
    badge:        o.status === 'active' ? 'Ativa' : 'Inativa',
    badgeVariant: o.status === 'active' ? 'active' : 'default',
    _raw:         o,
  }
}

export default function AdminOrganizacoesPage() {
  const [search, setSearch]         = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm]             = useState({ name: '', tenant_id: '' })

  const { data, isLoading } = useOrganizations()
  const { data: tenants }   = useTenants()
  const createMutation      = useCreateOrganization()
  const deactivateMutation  = useDeactivateOrganization()

  const items = (data ?? []).map(toItem)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    await createMutation.mutateAsync(form)
    setForm({ name: '', tenant_id: '' })
    setShowCreate(false)
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-primary tracking-[-0.02em]">Organizações</h1>
          <p className="text-sm text-ink-muted mt-0.5">{data?.length ?? 0} registros</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="h-10 px-4 rounded-[14px] bg-brand-500 text-ink-inverted font-medium text-sm hover:bg-brand-600 transition-colors flex items-center gap-2">
          <Plus size={16} /> Nova Organização
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-[20px] border border-white/8 bg-shell-600 p-5 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px] space-y-1">
            <label className="text-xs text-ink-muted">Nome</label>
            <input required value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full h-10 rounded-[12px] bg-white/6 border border-white/8 px-3 text-sm text-ink-primary outline-none focus:border-brand-500/50"
              placeholder="Secretaria Municipal de Educação" />
          </div>
          <div className="w-64 space-y-1">
            <label className="text-xs text-ink-muted">Tenant</label>
            <select required value={form.tenant_id}
              onChange={e => setForm(f => ({ ...f, tenant_id: e.target.value }))}
              className="w-full h-10 rounded-[12px] bg-white/6 border border-white/8 px-3 text-sm text-ink-primary outline-none focus:border-brand-500/50">
              <option value="">Selecionar...</option>
              {(tenants ?? []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
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
          pageTitle="Organizações" newLabel="Nova Organização"
          emptyText="Nenhuma organização cadastrada."
          onNew={() => setShowCreate(true)}
          renderDetail={(item) => {
            const o = item._raw
            const loc = o.tenants
              ? [
                  (o.tenants as { city?: string }).city,
                  (o.tenants as { state?: string }).state,
                ].filter(Boolean).join(', ') || null
              : null
            return (
              <div className="space-y-4">
                <div className="space-y-3">
                  <DetailRow label="Nome"       value={o.name}           icon={<Briefcase size={16} />} />
                  <DetailRow label="Tenant"     value={o.tenants?.name ?? o.tenant_id} icon={<Building2 size={16} />} />
                  <DetailRow label="Localização" value={loc}             icon={<Building2 size={16} />} />
                  <DetailRow label="Criado em"  value={new Date(o.created_at).toLocaleDateString('pt-BR')} icon={<Calendar size={16} />} />
                </div>
                {o.status === 'active' && (
                  <div className="pt-3 border-t border-white/6">
                    <button onClick={() => deactivateMutation.mutate(o.id)} disabled={deactivateMutation.isPending}
                      className="w-full h-10 rounded-[12px] bg-red-500/12 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                      <PowerOff size={15} /> Desativar
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
