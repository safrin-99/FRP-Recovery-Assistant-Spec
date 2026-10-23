import { DatabaseBackup } from 'lucide-react'
import { cn } from '@/lib/cn'
import { selectDataPreservation, useAppStore } from '@/store/appStore'

/**
 * Data Preservation Mode (PRD v2.4 §8, DESIGN.md §17). Muncul ketika pengguna menyatakan
 * layar terkunci dan data penting/backup belum pasti.
 */
export function DataPreservationBanner({ className }: { className?: string }) {
  const active = useAppStore(selectDataPreservation)
  const setPage = useAppStore((s) => s.setPage)
  if (!active) return null

  return (
    <div
      role="status"
      data-testid="data-preservation-banner"
      className={cn(
        'flex items-start gap-3 rounded-ui-lg border border-warning/45 bg-warning-soft px-4 py-3 text-sm leading-relaxed',
        className,
      )}
    >
      <DatabaseBackup aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" />
      <div className="min-w-0 text-fg-2">
        <p className="font-semibold text-fg">
          Data harus dipertahankan — jangan reset/flash sebelum keputusan pelanggan dicatat.
        </p>
        <p>
          Catat preferensi data pelanggan untuk tiket ini dan periksa backup dari perangkat lain atau akun cloud.{' '}
          <button
            type="button"
            onClick={() => setPage('screen-lock')}
            className="focus-ring rounded-ui-sm font-medium text-cyan underline-offset-4 hover:underline"
          >
            Buka Screen Lock Recovery
          </button>
        </p>
      </div>
    </div>
  )
}
