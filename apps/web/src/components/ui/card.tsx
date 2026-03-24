import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Sem padding interno (para conteúdo que vai até a borda) */
  flush?: boolean
  /** Borda colorida à esquerda para destaque */
  accent?: 'brand' | 'active' | 'warn' | 'danger'
}

export function Card({ className, flush, accent, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface-card rounded-lg border border-surface-border shadow-card',
        'transition-shadow duration-200',
        !flush && 'p-5',
        accent === 'brand'  && 'border-l-2 border-l-brand-600',
        accent === 'active' && 'border-l-2 border-l-active',
        accent === 'warn'   && 'border-l-2 border-l-warn',
        accent === 'danger' && 'border-l-2 border-l-danger',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function CardHeader({ title, subtitle, action, className, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn('flex items-start justify-between gap-4 mb-4', className)}
      {...props}
    >
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-ink-primary truncate">{title}</h3>
        {subtitle && (
          <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/** KPI / Stat Card — número grande com label e variação opcional */
interface StatCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  iconBg?: 'brand' | 'active' | 'warn' | 'danger' | 'neutral'
  change?: { value: string; positive: boolean }
  className?: string
}

const iconBgMap = {
  brand:   'bg-brand-50 text-brand-600',
  active:  'bg-active-light text-active-dark',
  warn:    'bg-warn-light text-warn-dark',
  danger:  'bg-danger-light text-danger-dark',
  neutral: 'bg-surface-hover text-ink-secondary',
}

export function StatCard({ label, value, icon, iconBg = 'brand', change, className }: StatCardProps) {
  return (
    <Card className={cn('hover:shadow-card-md', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">{label}</p>
          <p className="mt-1.5 text-3xl font-semibold text-ink-primary tabular-nums leading-none">
            {value}
          </p>
          {change && (
            <p className={cn(
              'mt-2 text-xs font-medium flex items-center gap-1',
              change.positive ? 'text-active-dark' : 'text-danger',
            )}>
              <span>{change.positive ? '↑' : '↓'}</span>
              {change.value}
            </p>
          )}
        </div>
        {icon && (
          <div className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            iconBgMap[iconBg],
          )}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}
