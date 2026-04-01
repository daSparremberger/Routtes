'use client'

import { useState } from 'react'
import { useTenants } from '@/hooks/admin/use-tenants'
import { useInvitesByTenant, useGenerateInvite, useResendInvite, type Invite } from '@/hooks/admin/use-invites'
import { Link2, Calendar, CheckCircle2, XCircle, Plus, Send } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'

export default function AdminConvitesPage() {
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null)
  const { data: tenants, isLoading: tenantsLoading } = useTenants()
  const { data: invites, isLoading: invitesLoading } = useInvitesByTenant(selectedTenantId ?? '')
  const generateMutation = useGenerateInvite()
  const resendMutation   = useResendInvite()

  const selectedTenant = tenants?.find(t => t.id === selectedTenantId)

  async function handleGenerate() {
    if (!selectedTenantId) return
    await generateMutation.mutateAsync({ tenant_id: selectedTenantId })
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-primary tracking-[-0.02em]">Convites</h1>
          <p className="text-sm text-ink-muted mt-0.5">Links de acesso para gestores</p>
        </div>
        {selectedTenantId && (
          <button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="h-10 px-4 rounded-[14px] bg-brand-500 text-ink-inverted font-medium text-sm hover:bg-brand-600 transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            <Plus size={16} />
            {generateMutation.isPending ? 'Gerando…' : 'Gerar convite'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-12 gap-5 flex-1 min-h-0">
        {/* Tenant selector */}
        <div className="col-span-4 rounded-[28px] border border-white/6 bg-shell-600 p-4 flex flex-col min-h-0">
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wider px-2 pb-3 border-b border-white/5 mb-3">
            Selecionar Tenant
          </p>
          <div className="overflow-auto space-y-2 flex-1">
            {tenantsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 rounded-[18px] skeleton" />
              ))
            ) : (tenants ?? []).map(t => (
              <motion.button
                key={t.id}
                whileHover={{ scale: 1.005, y: -1 }}
                onClick={() => setSelectedTenantId(t.id)}
                className={cn(
                  'w-full text-left rounded-[18px] border p-3 transition-all duration-200',
                  selectedTenantId === t.id
                    ? 'bg-white/10 border-white/10'
                    : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.05]',
                )}
              >
                <p className="font-medium text-sm text-ink-primary">{t.name}</p>
                <p className="text-xs text-ink-muted">{t.city}, {t.state}</p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Invites list */}
        <div className="col-span-8 rounded-[28px] border border-white/6 bg-shell-600 p-5 flex flex-col min-h-0">
          <AnimatePresence mode="wait">
            {!selectedTenantId ? (
              <div className="h-full rounded-[22px] border border-dashed border-white/10 flex items-center justify-center text-ink-muted text-sm">
                Selecione um tenant para ver os convites.
              </div>
            ) : (
              <motion.div
                key={selectedTenantId}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 18 }}
                transition={{ duration: 0.2 }}
                className="h-full flex flex-col"
              >
                <div className="pb-4 border-b border-white/5 mb-4">
                  <p className="text-sm text-ink-muted mb-1">Convites do tenant</p>
                  <h3 className="text-xl font-semibold text-ink-primary tracking-[-0.02em]">
                    {selectedTenant?.name}
                  </h3>
                </div>

                <div className="flex-1 overflow-auto space-y-3">
                  {invitesLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-20 rounded-[18px] skeleton" />
                    ))
                  ) : (invites ?? []).length === 0 ? (
                    <div className="h-32 rounded-[22px] border border-dashed border-white/10 flex items-center justify-center text-ink-muted text-sm">
                      Nenhum convite gerado ainda.
                    </div>
                  ) : (
                    (invites ?? []).map(invite => (
                      <InviteCard
                        key={invite.id}
                        invite={invite}
                        onResend={() => resendMutation.mutate(invite.id)}
                        resending={resendMutation.isPending && resendMutation.variables === invite.id}
                      />
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function InviteCard({ invite, onResend, resending }: {
  invite:   Invite
  onResend: () => void
  resending: boolean
}) {
  const expired = new Date(invite.expires_at) < new Date()

  return (
    <div className="rounded-[18px] border border-white/6 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            {invite.used ? (
              <CheckCircle2 size={15} className="text-green-400 shrink-0" />
            ) : expired ? (
              <XCircle size={15} className="text-red-400/70 shrink-0" />
            ) : (
              <Link2 size={15} className="text-brand-500 shrink-0" />
            )}
            <span className="text-xs font-medium text-ink-muted">
              {invite.used ? 'Usado' : expired ? 'Expirado' : 'Disponível'}
            </span>
          </div>
          <p className="text-sm font-mono text-ink-primary/70 truncate">{invite.token}</p>
        </div>
        {!invite.used && (
          <button
            onClick={onResend}
            disabled={resending}
            className="h-8 px-3 rounded-[10px] bg-white/6 text-ink-muted text-xs hover:bg-white/10 transition-colors flex items-center gap-1.5 disabled:opacity-60 shrink-0"
          >
            <Send size={12} />
            {resending ? 'Reenviando…' : 'Reenviar'}
          </button>
        )}
      </div>
      <div className="flex items-center gap-1 text-xs text-ink-muted">
        <Calendar size={12} />
        Expira em {new Date(invite.expires_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}
      </div>
    </div>
  )
}
