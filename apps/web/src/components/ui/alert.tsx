import { cn } from '@/lib/utils'
import { Info, CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react'

type AlertVariant = 'info' | 'success' | 'warning' | 'danger'

interface AlertProps {
  variant?: AlertVariant
  title?: string
  children?: React.ReactNode
  onDismiss?: () => void
  className?: string
}

const alertMap: Record<
  AlertVariant,
  { icon: React.ElementType; classes: string; iconClass: string }
> = {
  info: {
    icon:      Info,
    classes:   'bg-brand-50 border-brand-200 text-brand-900',
    iconClass: 'text-brand-600',
  },
  success: {
    icon:      CheckCircle2,
    classes:   'bg-active-light border-active/30 text-ink-primary',
    iconClass: 'text-active',
  },
  warning: {
    icon:      AlertTriangle,
    classes:   'bg-warn-light border-warn/30 text-ink-primary',
    iconClass: 'text-warn-dark',
  },
  danger: {
    icon:      XCircle,
    classes:   'bg-danger-light border-danger/30 text-ink-primary',
    iconClass: 'text-danger',
  },
}

export function Alert({ variant = 'info', title, children, onDismiss, className }: AlertProps) {
  const { icon: Icon, classes, iconClass } = alertMap[variant]

  return (
    <div className={cn('flex gap-3 rounded-lg border p-4', classes, className)}>
      <Icon size={16} className={cn('mt-0.5 shrink-0', iconClass)} aria-hidden />

      <div className="min-w-0 flex-1 text-sm leading-relaxed">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        {children && <div className="opacity-90">{children}</div>}
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 opacity-50 hover:opacity-80 transition-opacity"
          aria-label="Fechar alerta"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
