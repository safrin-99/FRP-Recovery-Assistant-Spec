import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Item navigasi. Label terlihat di sidebar penuh; saat sidebar diciutkan (< 1200 px)
 * label menjadi tooltip kustom (bukan tooltip native browser) dan tetap jadi nama aksesibel.
 */
export function SidebarNavItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group focus-ring relative flex h-[clamp(40px,5.7vh,56px)] w-full shrink-0 items-center gap-3.5 rounded-ui-md px-4 text-left text-base font-medium',
        'transition-colors duration-[var(--duration-fast)]',
        'max-[1199px]:justify-center max-[1199px]:px-0',
        active
          ? 'bg-blue text-white shadow-[inset_3px_0_0_var(--accent-cyan)]'
          : 'text-fg-2 hover:bg-raised hover:text-fg',
      )}
    >
      <Icon aria-hidden className="size-6 shrink-0" strokeWidth={1.75} />
      <span className="truncate max-[1199px]:sr-only">{label}</span>
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute top-1/2 left-full z-[var(--z-popover)] ml-3 hidden -translate-y-1/2 rounded-ui-sm border border-line-default bg-raised px-2.5 py-1.5 text-sm whitespace-nowrap text-fg shadow-[var(--shadow-popover)]',
          'max-[1199px]:group-hover:block max-[1199px]:group-focus-visible:block',
        )}
      >
        {label}
      </span>
    </button>
  )
}
