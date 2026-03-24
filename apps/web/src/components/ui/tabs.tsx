'use client'

import { cn } from '@/lib/utils'
import { motion } from 'motion/react'

export interface Tab {
  id: string
  label: string
  icon?: React.ReactNode
  badge?: number | string
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (id: string) => void
  variant?: 'underline' | 'pill'
  className?: string
}

export function Tabs({ tabs, activeTab, onChange, variant = 'underline', className }: TabsProps) {
  if (variant === 'pill') {
    return (
      <div className={cn('flex items-center gap-0.5 p-1 bg-surface-hover rounded-lg', className)}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                'relative flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium',
                'transition-colors duration-150',
                isActive ? 'text-ink-primary' : 'text-ink-muted hover:text-ink-secondary',
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="tab-pill-bg"
                  className="absolute inset-0 rounded-md bg-surface-card shadow-card"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                />
              )}
              <span className="relative flex items-center gap-2">
                {tab.icon && <span className="shrink-0">{tab.icon}</span>}
                {tab.label}
                {tab.badge !== undefined && (
                  <span
                    className={cn(
                      'flex h-4 min-w-4 items-center justify-center rounded-full px-1',
                      'text-2xs font-semibold',
                      isActive ? 'bg-brand-600 text-white' : 'bg-surface-border text-ink-muted',
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  // underline variant
  return (
    <div className={cn('relative flex items-center border-b border-surface-border', className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium',
              'transition-colors duration-150',
              isActive
                ? 'text-ink-primary'
                : 'text-ink-muted hover:text-ink-secondary hover:bg-surface-hover rounded-t-md',
            )}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            {tab.label}
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'flex h-4 min-w-4 items-center justify-center rounded-full px-1',
                  'text-2xs font-semibold',
                  isActive ? 'bg-brand-100 text-brand-700' : 'bg-surface-hover text-ink-muted',
                )}
              >
                {tab.badge}
              </span>
            )}
            {isActive && (
              <motion.span
                layoutId="tab-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-brand-600"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
