import { cn } from '@/lib/utils'

interface SeparatorProps {
  label?: string
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function Separator({
  label,
  orientation = 'horizontal',
  className,
}: SeparatorProps) {
  if (orientation === 'vertical') {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={cn('w-px self-stretch bg-surface-border', className)}
      />
    )
  }

  if (label) {
    return (
      <div
        role="separator"
        className={cn('flex items-center gap-3', className)}
      >
        <div className="h-px flex-1 bg-surface-border" />
        <span className="text-2xs font-semibold uppercase tracking-wider text-ink-muted">
          {label}
        </span>
        <div className="h-px flex-1 bg-surface-border" />
      </div>
    )
  }

  return (
    <div
      role="separator"
      className={cn('h-px w-full bg-surface-border', className)}
    />
  )
}
