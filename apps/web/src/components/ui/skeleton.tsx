import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number
  height?: string | number
  rounded?: 'sm' | 'md' | 'lg' | 'full'
}

export function Skeleton({ width, height, rounded = 'md', className, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'skeleton',
        rounded === 'sm'   && 'rounded-sm',
        rounded === 'md'   && 'rounded-md',
        rounded === 'lg'   && 'rounded-lg',
        rounded === 'full' && 'rounded-full',
        className,
      )}
      style={{ width, height, ...style }}
      aria-hidden
      {...props}
    />
  )
}

/** Skeleton para StatCard */
export function StatCardSkeleton() {
  return (
    <div className="bg-surface-card rounded-lg border border-surface-border shadow-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-3">
          <Skeleton height={12} width="40%" />
          <Skeleton height={28} width="55%" />
          <Skeleton height={12} width="30%" />
        </div>
        <Skeleton height={40} width={40} rounded="lg" />
      </div>
    </div>
  )
}

/** Skeleton para linha de tabela */
export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-surface-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton height={14} width={i === 0 ? '60%' : '40%'} />
        </td>
      ))}
    </tr>
  )
}
