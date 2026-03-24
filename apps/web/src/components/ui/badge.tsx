import { cn } from '@/lib/utils'

export type BadgeVariant =
  | 'active'    // verde — em execução, aprovado
  | 'warn'      // âmbar — atenção, pendente
  | 'danger'    // vermelho — cancelado, erro
  | 'neutral'   // cinza — inativo, rascunho
  | 'brand'     // azul — informativo, selecionado
  | 'outline'   // outline neutro

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  dot?: boolean
  className?: string
}

const variantMap: Record<BadgeVariant, string> = {
  active:  'bg-active-light text-active-dark border-active/20',
  warn:    'bg-warn-light text-warn-dark border-warn/20',
  danger:  'bg-danger-light text-danger-dark border-danger/20',
  neutral: 'bg-surface-hover text-ink-secondary border-surface-border',
  brand:   'bg-brand-50 text-brand-700 border-brand-200',
  outline: 'bg-transparent text-ink-secondary border-surface-border',
}

const dotMap: Record<BadgeVariant, string> = {
  active:  'bg-active',
  warn:    'bg-warn',
  danger:  'bg-danger',
  neutral: 'bg-ink-muted',
  brand:   'bg-brand-600',
  outline: 'bg-ink-muted',
}

export function Badge({ variant = 'neutral', children, dot, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5',
        'text-xs font-medium rounded-full border',
        'whitespace-nowrap',
        variantMap[variant],
        className,
      )}
    >
      {dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotMap[variant])} />
      )}
      {children}
    </span>
  )
}
