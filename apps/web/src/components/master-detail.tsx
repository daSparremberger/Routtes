'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'

export interface MasterItem {
  id: string
  title: string
  subtitle?: string
  badge?: string
  badgeVariant?: 'default' | 'active' | 'warn' | 'danger'
}

interface MasterDetailProps<T extends MasterItem> {
  items: T[]
  isLoading?: boolean
  search?: string
  searchKeys?: (keyof T)[]
  renderDetail: (item: T) => ReactNode
  pageTitle?: string
  onNew?: () => void
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  newLabel?: string
  emptyText?: string
}

const badgeColors = {
  default: 'bg-white/7 text-[#f7f1e4]/75',
  active: 'bg-white/7 text-[#f7f1e4]/75',
  warn: 'bg-white/7 text-[#f7f1e4]/75',
  danger: 'bg-white/7 text-[#f7f1e4]/75',
}

export function MasterDetail<T extends MasterItem>({
  items,
  isLoading,
  search,
  searchKeys = ['title', 'subtitle'] as (keyof T)[],
  renderDetail,
  pageTitle,
  onNew,
  onEdit,
  onDelete,
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
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null)
      return
    }

    if (!selectedId || !filtered.some((item) => item.id === selectedId)) {
      setSelectedId(filtered[0].id)
    }
  }, [filtered, selectedId])

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-5 xl:grid-cols-12">
      <div className="flex min-h-[520px] flex-col rounded-[28px] border border-white/6 bg-shell-600 p-4 xl:col-span-7">
        <div className="mb-3 flex items-center justify-between border-b border-white/5 px-2 pb-4">
          <div>
            <p className="text-sm text-[#f7f1e4]/55">Lista principal</p>
            {pageTitle ? <h2 className="text-xl font-semibold text-ink-primary">{pageTitle}</h2> : null}
          </div>
          {onNew ? (
            <button
              onClick={onNew}
              className="h-10 rounded-[14px] bg-white/6 px-4 text-sm text-ink-primary transition hover:bg-white/9"
              type="button"
            >
              {newLabel}
            </button>
          ) : null}
        </div>

        <div className="flex-1 space-y-2 overflow-auto pr-1">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="skeleton h-[72px] rounded-[22px]" />
            ))
          ) : filtered.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-[22px] border border-dashed border-white/10 text-sm text-ink-muted">
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
                    'w-full rounded-[22px] border p-4 text-left transition-all duration-200',
                    active ? 'border-white/10 bg-white/10' : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.05]',
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="mb-1 truncate text-[17px] font-medium text-ink-primary">{item.title}</h3>
                      {item.subtitle ? <p className="truncate text-sm text-[#f7f1e4]/55">{item.subtitle}</p> : null}
                    </div>
                    {item.badge ? (
                      <span
                        className={cn(
                          'shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs',
                          badgeColors[item.badgeVariant ?? 'default'],
                        )}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </div>
                </motion.button>
              )
            })
          )}
        </div>
      </div>

      <div className="min-h-[520px] rounded-[28px] border border-white/6 bg-shell-600 p-5 xl:col-span-5">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 18 }}
              transition={{ duration: 0.2 }}
              className="flex h-full flex-col"
            >
              <div className="mb-5 border-b border-white/5 pb-5">
                <p className="mb-2 text-sm text-[#f7f1e4]/50">Detalhes</p>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="mb-2 text-[28px] leading-none tracking-[-0.04em] text-ink-primary">{selected.title}</h3>
                    {selected.subtitle ? <p className="text-sm text-[#f7f1e4]/55">{selected.subtitle}</p> : null}
                  </div>
                  {selected.badge ? (
                    <span className="shrink-0 rounded-full bg-brand-500 px-3 py-1.5 text-xs font-medium text-ink-inverted">
                      {selected.badge}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">{renderDetail(selected)}</div>

              {(onEdit || onDelete) ? (
                <div className="mt-auto flex gap-3 pt-5">
                  {onEdit ? (
                    <button
                      onClick={() => onEdit(selected)}
                      className="h-11 flex-1 rounded-[16px] bg-brand-500 font-medium text-ink-inverted transition-transform hover:scale-[1.01]"
                    >
                      Editar
                    </button>
                  ) : null}
                  {onDelete ? (
                    <button
                      onClick={() => onDelete(selected)}
                      className="h-11 flex-1 rounded-[16px] bg-white/6 text-ink-primary transition hover:bg-white/9"
                    >
                      Arquivar
                    </button>
                  ) : null}
                </div>
              ) : null}
            </motion.div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-[22px] border border-dashed border-white/10 text-sm text-ink-muted">
              Selecione um item para ver os detalhes.
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export function DetailRow({
  label,
  value,
  icon,
}: {
  label: string
  value: string | null | undefined
  icon?: ReactNode
}) {
  if (!value) return null

  return (
    <div className="flex items-start gap-4 rounded-[20px] border border-white/5 bg-white/[0.03] p-4">
      {icon ? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white/7 text-brand-500">
          {icon}
        </div>
      ) : null}
      <div>
        <p className="mb-1 text-xs uppercase tracking-[0.18em] text-[#f7f1e4]/35">{label}</p>
        <p className="text-sm leading-relaxed text-[#f7f1e4]/80">{value}</p>
      </div>
    </div>
  )
}
