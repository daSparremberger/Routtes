'use client'

import { cn } from '@/lib/utils'
import { Search, MessageCircle, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface HeaderProps {
  title?: string
  search?: string
  onSearchChange?: (v: string) => void
  actions?: React.ReactNode
  className?: string
  canGoBack?: boolean
  canGoForward?: boolean
  onBack?: () => void
  onForward?: () => void
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
}: HeaderProps) {
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <header
      className={cn(
        'h-[72px] px-5 border-b bg-shell-900 flex items-center gap-3 relative z-10 shrink-0',
        'border-white/5',
        className,
      )}
    >
      {/* Nav arrows */}
      <button
        onClick={onBack}
        disabled={!canGoBack}
        className={cn(
          'h-11 w-7 flex items-center justify-center transition-all duration-200',
          canGoBack ? 'text-ink-muted hover:text-ink-primary' : 'text-white/20 cursor-not-allowed',
        )}
      >
        <ChevronLeft size={18} strokeWidth={1.8} />
      </button>
      <button
        onClick={onForward}
        disabled={!canGoForward}
        className={cn(
          'h-11 w-7 flex items-center justify-center transition-all duration-200',
          canGoForward ? 'text-ink-muted hover:text-ink-primary' : 'text-white/20 cursor-not-allowed',
        )}
      >
        <ChevronRight size={18} strokeWidth={1.8} />
      </button>

      {/* Title */}
      {title && (
        <div className="min-w-fit pr-2">
          <h1 className="text-[24px] leading-none font-semibold tracking-[-0.03em] text-ink-primary">
            {title}
          </h1>
        </div>
      )}

      <div className="flex-1" />

      {/* Search */}
      <div className="w-[280px] h-11 rounded-[16px] bg-white/5 border border-white/[0.06] flex items-center gap-3 px-4 text-ink-muted focus-within:border-white/12 focus-within:bg-white/[0.06] transition-all duration-200">
        <Search size={16} />
        <input
          value={search ?? ''}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Buscar"
          className="bg-transparent outline-none w-full text-sm text-ink-primary placeholder:text-ink-muted"
        />
      </div>

      {/* Chat toggle */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className={cn(
          'h-11 flex items-center justify-center transition-all duration-200 px-1',
          chatOpen ? 'text-ink-primary' : 'text-ink-muted hover:text-ink-primary',
        )}
      >
        <MessageCircle size={18} strokeWidth={1.8} />
      </button>

      {/* Page-level actions */}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}
