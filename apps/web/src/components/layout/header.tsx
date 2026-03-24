'use client'

import { cn } from '@/lib/utils'
import { Bell, Search } from 'lucide-react'

interface HeaderProps {
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}

export function Header({ title, subtitle, actions, className }: HeaderProps) {
  return (
    <header
      className={cn(
        'flex h-header items-center justify-between',
        'border-b border-surface-border bg-surface-card',
        'px-6 gap-4 shrink-0',
        className,
      )}
    >
      {/* Page title */}
      <div className="min-w-0">
        {title && (
          <h1 className="text-base font-semibold text-ink-primary truncate">{title}</h1>
        )}
        {subtitle && (
          <p className="text-xs text-ink-muted truncate">{subtitle}</p>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Search shortcut */}
        <button
          className={cn(
            'hidden md:flex items-center gap-2',
            'h-8 px-3 rounded-md border border-surface-border',
            'text-xs text-ink-muted',
            'hover:border-brand-600/40 hover:text-ink-primary',
            'transition-colors duration-150',
          )}
          aria-label="Buscar"
        >
          <Search size={13} />
          <span>Buscar</span>
          <kbd className="ml-1 font-mono text-2xs bg-surface-hover px-1 rounded">⌘K</kbd>
        </button>

        {/* Notifications */}
        <button
          className={cn(
            'relative flex h-8 w-8 items-center justify-center rounded-md',
            'text-ink-secondary hover:bg-surface-hover hover:text-ink-primary',
            'transition-colors duration-150',
          )}
          aria-label="Notificações"
        >
          <Bell size={16} />
          {/* Unread dot */}
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-danger" />
        </button>

        {/* Page-level actions */}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
