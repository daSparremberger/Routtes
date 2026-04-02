'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Search, MessageCircle, ChevronDown, ChevronLeft, ChevronRight, Menu } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

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
  onOpenMenu?: () => void
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
  onOpenMenu,
}: HeaderProps) {
  const [tenantOpen, setTenantOpen] = useState(false)
  const [displayTitle, setDisplayTitle] = useState(title ?? '')
  const [typingActive, setTypingActive] = useState(false)
  const timeoutRef = useRef<number | null>(null)
  const displayedTitleRef = useRef(title ?? '')

  function nextDelay(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  useEffect(() => {
    const nextTitle = title ?? ''
    const currentTitle = displayedTitleRef.current

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    if (nextTitle === currentTitle) {
      setDisplayTitle(nextTitle)
      setTypingActive(false)
      return
    }

    let current = currentTitle

    const erase = () => {
      setTypingActive(true)
      if (current.length > 0) {
        current = current.slice(0, -1)
        displayedTitleRef.current = current
        setDisplayTitle(current)
        timeoutRef.current = window.setTimeout(erase, nextDelay(42, 68))
        return
      }

      let index = 0
      const type = () => {
        index += 1
        const partial = nextTitle.slice(0, index)
        displayedTitleRef.current = partial
        setDisplayTitle(partial)
        if (index < nextTitle.length) {
          timeoutRef.current = window.setTimeout(type, nextDelay(65, 110))
        } else {
          setTypingActive(false)
        }
      }

      timeoutRef.current = window.setTimeout(type, 260)
    }

    timeoutRef.current = window.setTimeout(erase, 120)

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [title])

  return (
    <header
      className={cn(
        'relative z-10 flex shrink-0 flex-wrap items-center gap-3 bg-shell-900 px-4 py-3 lg:h-[72px] lg:flex-nowrap lg:px-5 lg:py-0',
        className,
      )}
    >
      <button
        onClick={onOpenMenu}
        className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white/[0.05] text-ink-primary transition hover:bg-white/[0.08] lg:hidden"
        type="button"
        aria-label="Abrir menu"
      >
        <Menu size={18} />
      </button>
      <button
        onClick={onBack}
        disabled={!canGoBack}
        className={cn(
          'hidden h-11 w-7 items-center justify-center transition-all duration-200 lg:flex',
          canGoBack ? 'text-ink-muted hover:text-ink-primary' : 'cursor-not-allowed text-white/20',
        )}
      >
        <ChevronLeft size={18} strokeWidth={1.8} />
      </button>
      <button
        onClick={onForward}
        disabled={!canGoForward}
        className={cn(
          'hidden h-11 w-7 items-center justify-center transition-all duration-200 lg:flex',
          canGoForward ? 'text-ink-muted hover:text-ink-primary' : 'cursor-not-allowed text-white/20',
        )}
      >
        <ChevronRight size={18} strokeWidth={1.8} />
      </button>

      {title && (
        <div className="min-w-0 flex-1 pr-2 lg:min-w-fit lg:flex-none">
          <h1 className="flex items-center text-[20px] leading-none font-semibold tracking-[-0.03em] text-ink-primary lg:text-[24px]">
            <span>{displayTitle}</span>
            {typingActive ? (
              <span className="ml-1 inline-block h-[24px] w-[2px] animate-pulse rounded-full bg-ink-primary/80" />
            ) : null}
          </h1>
        </div>
      )}

      <div className="hidden flex-1 lg:block" />

      <div className="order-3 flex h-11 w-full items-center gap-3 rounded-[16px] border border-white/[0.06] bg-white/5 px-4 text-ink-muted transition-all duration-200 focus-within:border-white/12 focus-within:bg-white/[0.06] lg:order-none lg:w-[280px]">
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
          className="flex h-11 min-w-0 max-w-[180px] items-center justify-between gap-3 px-1 text-sm text-ink-primary transition-all duration-200 hover:text-white sm:max-w-[220px] sm:min-w-[220px]"
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

      {actions && <div className="order-4 flex w-full items-center justify-end gap-2 lg:order-none lg:w-auto">{actions}</div>}
    </header>
  )
}
