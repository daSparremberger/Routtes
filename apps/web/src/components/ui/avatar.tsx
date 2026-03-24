import { cn, initials } from '@/lib/utils'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface AvatarProps {
  name?: string
  src?: string
  size?: AvatarSize
  className?: string
}

const sizeMap: Record<AvatarSize, string> = {
  xs: 'h-6 w-6 text-2xs',
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-11 w-11 text-base',
  xl: 'h-14 w-14 text-lg',
}

const colorVariants = [
  'bg-brand-100 text-brand-700',
  'bg-active-light text-active-dark',
  'bg-warn-light text-warn-dark',
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
  'bg-cyan-100 text-cyan-700',
]

function getColorForName(name: string): string {
  const index =
    name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colorVariants.length
  return colorVariants[index]
}

export function Avatar({ name = '', src, size = 'md', className }: AvatarProps) {
  const colorClass = getColorForName(name)

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center shrink-0 overflow-hidden',
        'font-semibold select-none',
        sizeMap[size],
        !src && colorClass,
        className,
      )}
      aria-label={name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span>{initials(name) || '?'}</span>
      )}
    </div>
  )
}
