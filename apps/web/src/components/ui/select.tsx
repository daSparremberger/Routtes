import { cn } from '@/lib/utils'
import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, children, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-sm font-medium text-ink-primary">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              "flex h-10 w-full appearance-none rounded-md border border-surface-border bg-surface-card px-3 py-2 text-sm text-ink-primary ring-offset-surface",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:border-brand-600",
              "disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
              error && "border-danger focus-visible:ring-danger focus-visible:border-danger",
              className
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted pointer-events-none" />
        </div>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    )
  }
)
Select.displayName = "Select"
