import { LoaderCircle } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'outline' | 'solid' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

const VARIANTS: Record<Variant, string> = {
  outline:
    'border border-line-default bg-transparent text-fg hover:border-line-strong hover:bg-raised active:bg-panel',
  solid: 'border border-transparent bg-blue text-white hover:bg-blue-hover active:brightness-95',
  ghost: 'border border-transparent bg-transparent text-fg-2 hover:bg-raised hover:text-fg',
  danger:
    'border border-danger/60 bg-transparent text-danger hover:bg-danger-soft active:brightness-95',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 gap-2 px-3 text-sm',
  md: 'h-11 gap-2.5 px-4 text-[15px]',
}

export interface ButtonProps extends Omit<ComponentProps<'button'>, 'children'> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  children?: ReactNode
}

/** Tombol standar (bukan aksi utama — itu `PrimaryActionButton`). */
export function Button({
  variant = 'outline',
  size = 'md',
  loading = false,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'focus-ring inline-flex shrink-0 items-center justify-center rounded-ui-md font-medium whitespace-nowrap',
        'transition-colors duration-[var(--duration-fast)] disabled:opacity-55',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <LoaderCircle aria-hidden className="size-[18px] animate-spin" /> : icon}
      {children}
    </button>
  )
}
