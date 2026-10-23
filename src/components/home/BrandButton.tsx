import { Ellipsis } from 'lucide-react'
import { BRAND_LOGOS, type BrandLogo } from '@/data/brandIcons'
import { cn } from '@/lib/cn'
import type { BrandId } from '@/types/domain'

function LogoSvg({ logo, className, color }: { logo: BrandLogo; className: string; color?: string }) {
  return (
    <svg aria-hidden viewBox={logo.viewBox} className={cn('shrink-0', className)} fill={color ?? 'currentColor'}>
      <path d={logo.path} />
    </svg>
  )
}

/** Monogram netral untuk brand tanpa aset logo berlisensi (realme, Infinix, TECNO). */
function Monogram({ id, label, selected }: { id: BrandId; label: string; selected: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-6 shrink-0 place-items-center rounded-[6px] text-[12px] font-bold',
        selected ? 'bg-white/20 text-white' : 'bg-raised text-fg-2',
      )}
    >
      {id === 'other' ? <Ellipsis className="size-4" /> : label.charAt(0).toUpperCase()}
    </span>
  )
}

/**
 * Tombol brand (DESIGN.md §8). Logo dari Simple Icons bila tersedia: wordmark menjadi
 * label tombol (seperti referensi), mark tampil di samping teks dengan warna merek.
 * Nama brand selalu menjadi nama aksesibel tombol.
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
  const logo = BRAND_LOGOS[id]

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
      {logo?.kind === 'wordmark' ? (
        <>
          <LogoSvg logo={logo} className="h-[13px] w-auto" />
          <span className="sr-only">{label}</span>
        </>
      ) : (
        <>
          {logo ? (
            <LogoSvg logo={logo} className="size-[22px]" color={logo.hex} />
          ) : (
            <Monogram id={id} label={label} selected={selected} />
          )}
          <span className="truncate">{label}</span>
        </>
      )}
    </button>
  )
}
