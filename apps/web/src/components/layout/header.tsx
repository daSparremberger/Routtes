'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Search, MessageCircle, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface HeaderProps {
  title?: string
  search?: string
  onSearchChange?: (v: string) => void
  actions?: ReactNode
  className?: string
  canGoBack?: boolean
  canGoForward?: boolean
  onBack?: () => void
  onForward?: () => void
  tenantOptions?: Array<{ id: string; name: string }>
  activeTenant?: { id: string; name: string }
  onSelectTenant?: (tenantId: string) => void
  chatOpen?: boolean
  onToggleChat?: () => void
}

export function Header({
  title,
  search,
  onSearchChange,
  actions,
  className,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  tenantOptions = [],
  activeTenant,
  onSelectTenant,
  chatOpen,
  onToggleChat,
}: HeaderProps) {
  const [tenantOpen, setTenantOpen] = useState(false)

  return (
    <header
      className={cn(
        'relative z-10 flex h-[72px] shrink-0 items-center gap-3 border-b border-white/5 bg-shell-900 px-5',
        className,
      )}
    >
      <button
        onClick={onBack}
        disabled={!canGoBack}
        className={cn(
          'flex h-11 w-7 items-center justify-center transition-all duration-200',
          canGoBack ? 'text-ink-muted hover:text-ink-primary' : 'cursor-not-allowed text-white/20',
        )}
      >
        <ChevronLeft size={18} strokeWidth={1.8} />
      </button>
      <button
        onClick={onForward}
        disabled={!canGoForward}
        className={cn(
          'flex h-11 w-7 items-center justify-center transition-all duration-200',
          canGoForward ? 'text-ink-muted hover:text-ink-primary' : 'cursor-not-allowed text-white/20',
        )}
      >
        <ChevronRight size={18} strokeWidth={1.8} />
      </button>

      {title && (
        <div className="min-w-fit pr-2">
          <h1 className="text-[24px] leading-none font-semibold tracking-[-0.03em] text-ink-primary">
            {title}
          </h1>
        </div>
      )}

      <div className="flex-1" />

      <div className="flex h-11 w-[280px] items-center gap-3 rounded-[16px] border border-white/[0.06] bg-white/5 px-4 text-ink-muted transition-all duration-200 focus-within:border-white/12 focus-within:bg-white/[0.06]">
        <Search size={16} />
        <input
          value={search ?? ''}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Buscar"
          className="w-full bg-transparent text-sm text-ink-primary outline-none placeholder:text-ink-muted"
        />
      </div>

      <button
        onClick={onToggleChat}
        className={cn(
          'flex h-11 items-center justify-center px-1 transition-all duration-200',
          chatOpen ? 'text-ink-primary' : 'text-ink-muted hover:text-ink-primary',
        )}
      >
        <MessageCircle size={18} strokeWidth={1.8} />
      </button>

      <div className="relative">
        <button
          onClick={() => setTenantOpen((current) => !current)}
          className="flex h-11 min-w-[220px] items-center justify-between gap-3 px-1 text-sm text-ink-primary transition-all duration-200 hover:text-white"
        >
          <span className="truncate">{activeTenant?.name ?? 'Selecionar tenant'}</span>
          <ChevronDown size={16} className={cn('transition-transform', tenantOpen && 'rotate-180')} />
        </button>

        {tenantOpen && tenantOptions.length > 0 && (
          <div className="absolute right-0 top-[52px] z-20 w-[260px] rounded-[20px] border border-white/8 bg-[#282319] p-2 shadow-2xl">
            {tenantOptions.map((tenant) => {
              const active = activeTenant?.id === tenant.id
              return (
                <button
                  key={tenant.id}
                  onClick={() => {
                    onSelectTenant?.(tenant.id)
                    setTenantOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-[14px] px-3 py-3 text-left text-sm transition-all',
                    active ? 'bg-white/10 text-ink-primary' : 'text-ink-secondary hover:bg-white/6',
                  )}
                >
                  <span>{tenant.name}</span>
                  {active ? <span className="text-brand-500">●</span> : null}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}
