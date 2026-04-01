'use client'

import { useState, useMemo, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'

export interface MasterItem {
  id:       string
  title:    string
  subtitle?: string
  badge?:   string
  badgeVariant?: 'default' | 'active' | 'warn' | 'danger'
}

interface MasterDetailProps<T extends MasterItem> {
  items:        T[]
  isLoading?:   boolean
  search?:      string
  searchKeys?:  (keyof T)[]
  renderDetail: (item: T) => ReactNode
  pageTitle?:   string
  onNew?:       () => void
  newLabel?:    string
  emptyText?:   string
}

const badgeColors = {
  default: 'bg-white/7 text-ink-muted',
  active:  'bg-active/15 text-active',
  warn:    'bg-warn/15 text-warn',
  danger:  'bg-danger/15 text-danger',
}

export function MasterDetail<T extends MasterItem>({
  items,
  isLoading,
  search,
  searchKeys = ['title', 'subtitle'] as (keyof T)[],
  renderDetail,
  pageTitle,
  onNew,
  newLabel = 'Novo registro',
  emptyText = 'Nenhum item encontrado.',
}: MasterDetailProps<T>) {
  const filtered = useMemo(() => {
    if (!search?.trim()) return items
    const q = search.toLowerCase()
    return items.filter((item) =>
      searchKeys.some((key) => String(item[key] ?? '').toLowerCase().includes(q)),
    )
  }, [items, search, searchKeys])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = filtered.find((i) => i.id === selectedId) ?? filtered[0] ?? null

  return (
    <div className="grid grid-cols-12 gap-5 h-full min-h-0">
      {/* ── List panel ────────────────────────────────────────────────────── */}
      <div className="col-span-7 rounded-[28px] border border-white/6 bg-shell-600 p-4 flex flex-col min-h-0">
        {/* List header */}
        <div className="flex items-center justify-between px-2 pb-4 border-b border-white/5 mb-3">
          <div>
            <p className="text-sm text-ink-muted">Lista principal</p>
            {pageTitle && <h2 className="text-xl font-semibold text-ink-primary">{pageTitle}</h2>}
          </div>
          {onNew && (
            <button
              onClick={onNew}
              className="h-10 px-4 rounded-[14px] bg-white/6 hover:bg-white/10 transition text-sm text-ink-primary"
            >
              {newLabel}
            </button>
          )}
        </div>

        {/* List body */}
        <div className="overflow-auto pr-1 space-y-2 flex-1">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[72px] rounded-[22px] skeleton" />
            ))
          ) : filtered.length === 0 ? (
            <div className="h-32 rounded-[22px] border border-dashed border-white/10 flex items-center justify-center text-ink-muted text-sm">
              {emptyText}
            </div>
          ) : (
            filtered.map((item) => {
              const active = selected?.id === item.id
              return (
                <motion.button
                  key={item.id}
                  whileHover={{ scale: 1.005, y: -1 }}
                  onClick={() => setSelectedId(item.id)}
                  className={cn(
                    'w-full text-left rounded-[22px] border p-4 transition-all duration-200',
                    active
                      ? 'bg-white/10 border-white/10'
                      : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.05]',
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-[17px] font-medium text-ink-primary mb-1 truncate">{item.title}</h3>
                      {item.subtitle && (
                        <p className="text-sm text-ink-muted truncate">{item.subtitle}</p>
                      )}
                    </div>
                    {item.badge && (
                      <span className={cn(
                        'px-3 py-1 rounded-full text-xs whitespace-nowrap shrink-0',
                        badgeColors[item.badgeVariant ?? 'default'],
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                </motion.button>
              )
            })
          )}
        </div>
      </div>

      {/* ── Detail panel ──────────────────────────────────────────────────── */}
      <div className="col-span-5 rounded-[28px] border border-white/6 bg-shell-600 p-5 min-h-0">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 18 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col"
            >
              {/* Detail header */}
              <div className="pb-5 border-b border-white/5 mb-5">
                <p className="text-sm text-ink-muted mb-2">Detalhes</p>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[28px] tracking-[-0.04em] font-semibold leading-none mb-2 text-ink-primary">
                      {selected.title}
                    </h3>
                    {selected.subtitle && (
                      <p className="text-sm text-ink-muted">{selected.subtitle}</p>
                    )}
                  </div>
                  {selected.badge && (
                    <span className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium shrink-0',
                      selected.badgeVariant === 'active'
                        ? 'bg-brand-500 text-ink-inverted'
                        : badgeColors[selected.badgeVariant ?? 'default'],
                    )}>
                      {selected.badge}
                    </span>
                  )}
                </div>
              </div>

              {/* Detail content */}
              <div className="flex-1 overflow-auto">
                {renderDetail(selected)}
              </div>
            </motion.div>
          ) : (
            <div className="h-full rounded-[22px] border border-dashed border-white/10 flex items-center justify-center text-ink-muted text-sm">
              Selecione um item para ver os detalhes.
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Detail row helper ────────────────────────────────────────────────────────
export function DetailRow({
  label, value, icon,
}: {
  label: string
  value: string | null | undefined
  icon?: ReactNode
}) {
  if (!value) return null
  return (
    <div className="rounded-[16px] bg-white/[0.03] border border-white/5 p-4 flex items-start gap-4">
      {icon && (
        <div className="h-9 w-9 rounded-[12px] bg-white/7 flex items-center justify-center text-brand-500 shrink-0">
          {icon}
        </div>
      )}
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-ink-muted mb-1">{label}</p>
        <p className="text-sm text-ink-primary/80 leading-relaxed">{value}</p>
      </div>
    </div>
  )
}
