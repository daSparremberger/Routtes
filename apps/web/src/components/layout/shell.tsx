'use client'

import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { Sidebar } from './sidebar'
import { Header } from './header'

interface ShellProps {
  children: ReactNode
  title?: string
  headerActions?: ReactNode
  searchValue?: string
  onSearchChange?: (v: string) => void
}

export function Shell({ children, title, headerActions, searchValue, onSearchChange }: ShellProps) {
  const [chatOpen, setChatOpen] = useState(false)
  const tenants = useMemo(
    () => [
      { id: 't1', name: 'Routtes Cascavel' },
      { id: 't2', name: 'Lumina Escolar' },
      { id: 't3', name: 'Van Oeste' },
    ],
    [],
  )
  const [tenantId, setTenantId] = useState(tenants[0]?.id ?? 't1')
  const activeTenant = tenants.find((tenant) => tenant.id === tenantId) ?? tenants[0]

  return (
    <div className="relative flex h-screen overflow-hidden bg-shell-900">
      <Sidebar />

      <div className="flex flex-1 min-w-0 flex-col overflow-hidden rounded-l-[28px] bg-shell-900">
        <Header
          title={title}
          search={searchValue}
          onSearchChange={onSearchChange}
          actions={headerActions}
          tenantOptions={tenants}
          activeTenant={activeTenant}
          onSelectTenant={setTenantId}
          chatOpen={chatOpen}
          onToggleChat={() => setChatOpen((current) => !current)}
        />

        <main className="relative flex-1 overflow-y-auto rounded-tl-[28px] border-b border-white/5 bg-shell-700 p-5">
          {children}
        </main>
      </div>

      {chatOpen && (
        <aside className="absolute bottom-4 right-4 top-4 z-20 w-[360px] rounded-[26px] border border-white/10 bg-[#1b1812]/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-ink-muted">Assistente</p>
              <h3 className="text-lg font-semibold text-ink-primary">Chat operacional</h3>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-ink-primary transition hover:bg-white/10"
              aria-label="Fechar chat"
            >
              ×
            </button>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl bg-white/5 p-4 text-sm text-ink-secondary">
              Olá. Aqui vai entrar o painel lateral de chat, suporte ou central operacional.
            </div>
            <div className="rounded-2xl bg-brand-500 p-4 text-sm font-medium text-ink-inverted">
              Exemplo: mostrar alertas de rota, mensagens da escola e pendências da tenant ativa.
            </div>
            <div className="rounded-[22px] border border-white/6 bg-shell-600 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm text-ink-primary">
                <MessageCircle size={16} className="text-brand-500" />
                Conversas rápidas
              </div>
              <div className="space-y-2 text-sm text-ink-muted">
                <p>3 alertas de atraso aguardando revisão.</p>
                <p>1 escola solicitou ajuste de embarque.</p>
                <p>2 motoristas enviaram atualização de rota.</p>
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}
