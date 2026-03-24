'use client'

import { cn } from '@/lib/utils'
import { type ButtonHTMLAttributes, forwardRef } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm ' +
    'disabled:bg-brand-200 disabled:text-brand-400',
  secondary:
    'bg-surface-hover text-ink-primary hover:bg-surface-border border border-surface-border ' +
    'disabled:opacity-50',
  ghost:
    'text-ink-secondary hover:bg-surface-hover hover:text-ink-primary ' +
    'disabled:opacity-40',
  danger:
    'bg-danger text-white hover:bg-danger-dark active:bg-red-700 shadow-sm ' +
    'disabled:bg-danger/40',
  outline:
    'border border-brand-600 text-brand-600 hover:bg-brand-50 active:bg-brand-100 ' +
    'disabled:opacity-50',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm:  'h-8 px-3 text-sm gap-1.5 rounded',
  md:  'h-9 px-4 text-sm gap-2 rounded-md',
  lg:  'h-11 px-5 text-base gap-2 rounded-md',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    disabled,
    children,
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={cn(
        // Base
        'inline-flex items-center justify-center font-medium',
        'transition-colors duration-150 ease-in-out',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
        'disabled:cursor-not-allowed select-none',
        // Variant + size
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <Spinner size={size} />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <span className="shrink-0">{icon}</span>
          )}
          {children}
          {icon && iconPosition === 'right' && (
            <span className="shrink-0">{icon}</span>
          )}
        </>
      )}
    </button>
  )
})

function Spinner({ size }: { size: ButtonSize }) {
  const s = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'
  return (
    <svg
      className={cn('animate-spin', s)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
