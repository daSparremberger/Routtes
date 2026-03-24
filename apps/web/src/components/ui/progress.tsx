import { cn } from '@/lib/utils'

// ─── Progress Bar ─────────────────────────────────────────────────────────────

interface ProgressProps {
  value: number       // 0–100
  max?: number
  variant?: 'brand' | 'active' | 'warn' | 'danger'
  size?: 'xs' | 'sm' | 'md'
  showLabel?: boolean
  className?: string
}

const barVariant = {
  brand:  'bg-brand-600',
  active: 'bg-active',
  warn:   'bg-warn',
  danger: 'bg-danger',
}

const barSize = {
  xs: 'h-1',
  sm: 'h-1.5',
  md: 'h-2.5',
}

export function Progress({
  value,
  max = 100,
  variant = 'brand',
  size = 'sm',
  showLabel,
  className,
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <p className="mb-1.5 text-xs font-medium text-ink-secondary tabular-nums">
          {Math.round(pct)}%
        </p>
      )}
      <div
        className={cn('w-full overflow-hidden rounded-full bg-surface-hover', barSize[size])}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemax={max}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', barVariant[variant])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── Progress Ring ────────────────────────────────────────────────────────────

interface ProgressRingProps {
  value: number       // 0–100
  size?: number
  stroke?: number
  variant?: 'brand' | 'active' | 'warn' | 'danger'
  label?: React.ReactNode
  className?: string
}

const ringColor = {
  brand:  '#2563EB',
  active: '#10B981',
  warn:   '#F59E0B',
  danger: '#EF4444',
}

export function ProgressRing({
  value,
  size = 80,
  stroke = 6,
  variant = 'brand',
  label,
  className,
}: ProgressRingProps) {
  const r     = (size - stroke) / 2
  const circ  = 2 * Math.PI * r
  const offset = circ - (Math.min(100, Math.max(0, value)) / 100) * circ

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-surface-hover"
        />
        {/* Fill */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={ringColor[variant]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>

      {label && (
        <div className="absolute inset-0 flex items-center justify-center">
          {label}
        </div>
      )}
    </div>
  )
}
