import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export function MethodCard({
  icon: Icon,
  title,
  description,
  selected,
  onSelect,
}: {
  icon: LucideIcon
  title: string
  description: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'focus-ring flex min-h-[clamp(150px,18.5vh,190px)] min-w-0 flex-col items-center justify-center gap-2 rounded-ui-md border px-3 py-3 text-center',
        'transition-colors duration-[var(--duration-fast)]',
        selected
          ? 'border-2 border-blue-hover bg-[image:var(--gradient-selected)] text-white'
          : 'border-line-default bg-panel text-fg hover:border-line-strong hover:bg-raised',
      )}
    >
      <Icon aria-hidden className="size-10 shrink-0" strokeWidth={1.6} />
      <span className="text-base leading-tight font-semibold">{title}</span>
      <span className={cn('text-sm leading-snug', selected ? 'text-white/80' : 'text-fg-muted')}>{description}</span>
    </button>
  )
}
