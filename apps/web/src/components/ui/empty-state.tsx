import { cn } from '@/lib/utils'
import { Button } from './button'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        'py-16 px-6',
        className,
      )}
    >
      {icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-hover text-ink-muted mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-ink-primary">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-ink-muted max-w-xs">{description}</p>
      )}
      {action && (
        <div className="mt-5">
          <Button size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  )
}
