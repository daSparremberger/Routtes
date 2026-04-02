'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowLeft, Plus } from 'lucide-react'
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
  titleContent?: ReactNode
  headerDescription?: ReactNode
  headerActions?: ReactNode
  onNew?: () => void
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  newLabel?: string
  emptyText?: string
  onLoadMore?: () => void
  hasMore?: boolean
  isFetchingMore?: boolean
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
  titleContent,
  headerDescription,
  headerActions,
  onNew,
  onEdit,
  onDelete,
  newLabel = 'Novo registro',
  emptyText = 'Nenhum item encontrado.',
  onLoadMore,
  hasMore,
  isFetchingMore,
}: MasterDetailProps<T>) {
  const filtered = useMemo(() => {
    if (!search?.trim()) return items
    const q = search.toLowerCase()
    return items.filter((item) =>
      searchKeys.some((key) => String(item[key] ?? '').toLowerCase().includes(q)),
    )
  }, [items, search, searchKeys])

  const sentinelRef = useRef<HTMLDivElement>(null)
  const isFetchingMoreRef = useRef(isFetchingMore)
  useEffect(() => { isFetchingMoreRef.current = isFetchingMore }, [isFetchingMore])

  useEffect(() => {
    if (!onLoadMore || !hasMore) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingMoreRef.current) onLoadMore()
      },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [onLoadMore, hasMore])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
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

  function handleSelect(itemId: string) {
    setSelectedId(itemId)
    setMobileDetailOpen(true)
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-5 xl:grid-cols-12">
      <div className="flex min-h-[420px] flex-col p-0 sm:p-2 xl:col-span-7">
        <div className="mb-4 flex flex-col gap-4 border-b border-white/5 px-1 pb-4 sm:px-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            {titleContent ? titleContent : null}
            {!titleContent && pageTitle ? <h2 className="text-xl font-semibold text-ink-primary">{pageTitle}</h2> : null}
            {headerDescription ? <p className="mt-2 max-w-[620px] text-sm text-ink-primary lg:text-base">{headerDescription}</p> : null}
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            {onNew ? (
              <button
                onClick={onNew}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[15px] bg-brand-500 px-4 text-sm font-medium text-ink-inverted transition-colors hover:bg-brand-600 lg:h-11 lg:rounded-[16px] lg:px-5"
                type="button"
              >
                <Plus size={16} strokeWidth={2.2} />
                {newLabel}
              </button>
            ) : null}
            {headerActions}
          </div>
        </div>

        <div className="flex-1 space-y-1 overflow-auto pr-1">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="skeleton h-[72px] rounded-[22px]" />
            ))
          ) : filtered.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-[22px] text-sm text-ink-muted">
              {emptyText}
            </div>
          ) : (
            filtered.map((item) => {
              const active = selected?.id === item.id
              return (
                <motion.button
                  key={item.id}
                  whileHover={{ scale: 1.005, y: -1 }}
                  onClick={() => handleSelect(item.id)}
                  className={cn(
                    'w-full rounded-[22px] p-4 text-left transition-all duration-200',
                    active ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]',
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
          {!isLoading && filtered.length > 0 ? (
            <>
              <div ref={sentinelRef} />
              {isFetchingMore ? (
                <div className="py-3 text-center text-xs text-[#f7f1e4]/40">Carregando...</div>
              ) : null}
              {hasMore === false ? (
                <div className="py-4 text-center text-xs text-[#f7f1e4]/30">Fim da lista</div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <div className="hidden min-h-[320px] border-t border-white/[0.05] pt-5 xl:block xl:col-span-5 xl:min-h-[520px] xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
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
            <div className="flex h-full items-center justify-center rounded-[22px] text-sm text-ink-muted">
              Selecione um item para ver os detalhes.
            </div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {mobileDetailOpen && selected ? (
          <motion.div
            initial={{ opacity: 0, x: 26 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 26 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-shell-700 px-4 pb-6 pt-5 xl:hidden"
          >
            <div className="flex h-full flex-col">
              <div className="mb-5 flex items-center gap-3 border-b border-white/[0.05] pb-4">
                <button
                  type="button"
                  onClick={() => setMobileDetailOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white/[0.05] text-ink-primary"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#f7f1e4]/35">Detalhes</p>
                  <p className="truncate text-base font-semibold text-ink-primary">{selected.title}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="mb-5 border-b border-white/5 pb-5">
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
              </div>

              {(onEdit || onDelete) ? (
                <div className="mt-5 flex gap-3 border-t border-white/[0.05] pt-4">
                  {onEdit ? (
                    <button
                      onClick={() => onEdit(selected)}
                      className="h-10 flex-1 rounded-[15px] bg-brand-500 text-sm font-medium text-ink-inverted lg:h-11 lg:rounded-[16px]"
                    >
                      Editar
                    </button>
                  ) : null}
                  {onDelete ? (
                    <button
                      onClick={() => onDelete(selected)}
                      className="h-10 flex-1 rounded-[15px] bg-white/6 text-sm text-ink-primary lg:h-11 lg:rounded-[16px]"
                    >
                      Arquivar
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
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
    <div className="flex items-start gap-4 rounded-[20px] px-1 py-3">
      {icon ? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white/[0.05] text-brand-500">
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
