import { cn } from '@/lib/cn'
import { useAppStore } from '@/store/appStore'
import { Panel } from '@/components/ui/Panel'
import { DemoBadge } from '@/components/ui/StatusBadge'
import { ClearLogsButton } from './ClearLogsButton'
import { LogViewer } from './LogViewer'

const RUN_LABELS = {
  idle: null,
  running: 'Berjalan',
  cancelled: 'Dibatalkan',
  finished: 'Selesai',
  failed: 'Gagal',
} as const

/** Progress + log terbaru (DESIGN.md §9). Persentase hanya dari tahapan proses nyata/demo. */
export function ProgressPanel({ className }: { className?: string }) {
  const run = useAppStore((s) => s.run)
  const logs = useAppStore((s) => s.logs)
  const hasDemo = logs.some((entry) => entry.source === 'demo')
  const percent = run.progress ?? 0
  const runLabel = RUN_LABELS[run.status]

  return (
    <Panel aria-labelledby="progress-title" className={cn('flex min-h-0 flex-col px-5 py-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 id="progress-title" className="text-[19px] font-semibold text-fg">
            Progress
          </h2>
          {hasDemo ? <DemoBadge /> : null}
        </div>
        <span className="text-base text-fg-2 tabular-nums">
          {runLabel ? <span className="mr-2 text-sm text-fg-muted">{runLabel}</span> : null}
          {percent}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Progress diagnosis"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={run.stage ?? `${percent}%`}
        className="mt-3 h-3 shrink-0 overflow-hidden rounded-full bg-track"
      >
        <div
          className="h-full rounded-full bg-[image:var(--gradient-primary)] transition-[width] duration-[var(--duration-base)]"
          style={{ width: `${percent}%` }}
        />
      </div>
      {/* basis-0: log tidak ikut menentukan tinggi baris; scroll internal (DESIGN.md §9). */}
      <LogViewer
        logs={logs.slice(-50)}
        className="mt-3 min-h-[72px] flex-1 basis-0"
        emptyMessage="Belum ada log. Jalankan Auto Detect atau diagnosis."
      />
      <div className="mt-3 flex shrink-0 justify-end">
        <ClearLogsButton />
      </div>
    </Panel>
  )
}
