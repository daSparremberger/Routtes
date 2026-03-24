'use client'

import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

export interface DropdownItem {
  label: string
  icon?: React.ReactNode
  onClick?: () => void
  variant?: 'default' | 'danger'
  disabled?: boolean
}

export interface DropdownSeparator {
  separator: true
  label?: string
}

export type DropdownEntry = DropdownItem | DropdownSeparator

interface DropdownProps {
  trigger: React.ReactNode
  items: DropdownEntry[]
  align?: 'left' | 'right'
  className?: string
}

export function Dropdown({ trigger, items, align = 'right', className }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'absolute z-50 mt-1.5 min-w-48 rounded-lg overflow-hidden',
              'bg-surface-card border border-surface-border shadow-card-lg',
              'py-1',
              align === 'right' ? 'right-0' : 'left-0',
            )}
          >
            {items.map((item, i) => {
              if ('separator' in item) {
                return (
                  <div key={i} className="my-1 px-3">
                    {item.label && (
                      <p className="mb-1.5 pt-0.5 text-2xs font-semibold uppercase tracking-wider text-ink-muted">
                        {item.label}
                      </p>
                    )}
                    <div className="h-px bg-surface-border" />
                  </div>
                )
              }

              return (
                <button
                  key={i}
                  onClick={() => {
                    item.onClick?.()
                    setOpen(false)
                  }}
                  disabled={item.disabled}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors duration-100 text-left',
                    item.variant === 'danger'
                      ? 'text-danger hover:bg-danger-light'
                      : 'text-ink-primary hover:bg-surface-hover',
                    item.disabled && 'pointer-events-none opacity-40',
                  )}
                >
                  {item.icon && (
                    <span className={cn('shrink-0', item.variant === 'danger' ? 'text-danger' : 'text-ink-muted')}>
                      {item.icon}
                    </span>
                  )}
                  {item.label}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
