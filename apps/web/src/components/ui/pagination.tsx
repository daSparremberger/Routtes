'use client'

import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
  page: number
  total: number       // total de items
  perPage: number
  onChange: (page: number) => void
  className?: string
}

export function Pagination({ page, total, perPage, onChange, className }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const from = Math.min((page - 1) * perPage + 1, total)
  const to   = Math.min(page * perPage, total)

  if (totalPages <= 1) return null

  const pages = getPageNumbers(page, totalPages)

  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <p className="text-xs text-ink-muted tabular-nums">
        {from}–{to} de <span className="font-medium text-ink-secondary">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        <PagBtn onClick={() => onChange(1)} disabled={page === 1} aria-label="Primeira página">
          <ChevronsLeft size={14} />
        </PagBtn>
        <PagBtn onClick={() => onChange(page - 1)} disabled={page === 1} aria-label="Página anterior">
          <ChevronLeft size={14} />
        </PagBtn>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-xs text-ink-muted">…</span>
          ) : (
            <PagBtn
              key={p}
              onClick={() => onChange(p as number)}
              active={p === page}
            >
              {p}
            </PagBtn>
          ),
        )}

        <PagBtn onClick={() => onChange(page + 1)} disabled={page === totalPages} aria-label="Próxima página">
          <ChevronRight size={14} />
        </PagBtn>
        <PagBtn onClick={() => onChange(totalPages)} disabled={page === totalPages} aria-label="Última página">
          <ChevronsRight size={14} />
        </PagBtn>
      </div>
    </div>
  )
}

function PagBtn({
  children,
  onClick,
  disabled,
  active,
  ...props
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  active?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-7 min-w-7 items-center justify-center rounded-md px-1.5',
        'text-xs font-medium transition-colors duration-100',
        active
          ? 'bg-brand-600 text-white'
          : 'text-ink-secondary hover:bg-surface-hover hover:text-ink-primary',
        disabled && 'pointer-events-none opacity-30',
      )}
      {...props}
    >
      {children}
    </button>
  )
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '...')[] = [1]

  if (current > 3) pages.push('...')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i)
  }
  if (current < total - 2) pages.push('...')
  pages.push(total)

  return pages
}
