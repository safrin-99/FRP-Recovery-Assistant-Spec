import { Play, Square } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Aksi utama (DESIGN.md §8). Saat berjalan berubah menjadi "Batalkan Diagnosis".
 * Ketika tidak tersedia, tombol disabled dan alasannya ditampilkan di bawahnya.
 */
export function PrimaryActionButton({
  running,
  disabled,
  disabledReason,
  onStart,
  onCancel,
}: {
  running: boolean
  disabled: boolean
  disabledReason?: string
  onStart: () => void
  onCancel: () => void
}) {
  const reasonId = 'primary-action-reason'
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={running ? onCancel : onStart}
        disabled={!running && disabled}
        aria-describedby={!running && disabled && disabledReason ? reasonId : undefined}
        className={cn(
          'focus-ring flex h-[clamp(56px,6.8vh,70px)] w-full items-center justify-center gap-3.5 rounded-ui-lg text-[20px] font-semibold',
          'transition-[filter,transform,background] duration-[var(--duration-fast)]',
          running
            ? 'border border-line-strong bg-raised text-fg hover:bg-panel'
            : 'bg-[image:var(--gradient-primary)] text-white enabled:hover:brightness-110 enabled:active:translate-y-px enabled:active:brightness-95',
          'disabled:cursor-not-allowed disabled:opacity-45 disabled:saturate-50',
        )}
      >
        {running ? (
          <Square aria-hidden className="size-5 fill-current" />
        ) : (
          <Play aria-hidden className="size-6 fill-current" />
        )}
        {running ? 'Batalkan Diagnosis' : 'Mulai Diagnosis FRP'}
      </button>
      {!running && disabled && disabledReason ? (
        <p id={reasonId} className="text-center text-xs text-fg-muted">
          {disabledReason}
        </p>
      ) : null}
    </div>
  )
}
