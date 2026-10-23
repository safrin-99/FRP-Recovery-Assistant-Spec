import { Ellipsis } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { BrandId } from '@/types/domain'

/**
 * Tombol brand: glyph tipografis sederhana + label. Logo resmi tidak dipakai sampai
 * aset berlisensi tersedia (DESIGN.md §8: jangan meniru logo secara asal).
 */
export function BrandButton({
  id,
  label,
  selected,
  onSelect,
}: {
  id: BrandId
  label: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'focus-ring flex h-[clamp(44px,5.4vh,56px)] min-w-[100px] flex-none items-center justify-center gap-2 rounded-ui-md border px-3 text-base font-medium',
        'transition-colors duration-[var(--duration-fast)]',
        selected
          ? 'border-blue-hover bg-blue font-semibold text-white'
          : 'border-line-default bg-panel text-fg hover:border-line-strong hover:bg-raised',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'grid size-6 shrink-0 place-items-center rounded-[6px] text-[12px] font-bold',
          selected ? 'bg-white/20 text-white' : 'bg-raised text-fg-2',
        )}
      >
        {id === 'other' ? <Ellipsis className="size-4" /> : label.charAt(0).toUpperCase()}
      </span>
      <span className="truncate">{label}</span>
    </button>
  )
}
