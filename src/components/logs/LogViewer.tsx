import { CircleCheck, CircleX, Info, TriangleAlert, type LucideIcon } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'
import { formatLogTime } from '@/lib/format'
import type { LogEntry, LogLevel } from '@/types/domain'

const LEVEL_META: Record<LogLevel, { icon: LucideIcon; className: string; label: string }> = {
  info: { icon: Info, className: 'text-fg-muted', label: 'Info' },
  success: { icon: CircleCheck, className: 'text-success', label: 'Berhasil' },
  warning: { icon: TriangleAlert, className: 'text-warning', label: 'Peringatan' },
  error: { icon: CircleX, className: 'text-danger', label: 'Error' },
}

/** Daftar log ber-scroll internal; otomatis turun ke entri terbaru. */
export function LogViewer({
  logs,
  emptyMessage = 'Belum ada log.',
  showCategory = false,
  className,
}: {
  logs: ReadonlyArray<LogEntry>
  emptyMessage?: string
  showCategory?: boolean
  className?: string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [logs.length])

  return (
    <div
      ref={scrollRef}
      tabIndex={0}
      role="log"
      aria-label="Log diagnosis"
      aria-live="polite"
      className={cn(
        'focus-ring min-h-0 overflow-y-auto rounded-ui-md border border-line bg-[#091019] px-3 py-2.5 font-[inherit]',
        className,
      )}
    >
      {logs.length === 0 ? (
        <p className="py-2 text-sm text-fg-muted">{emptyMessage}</p>
      ) : (
        <ul className="space-y-1">
          {logs.map((entry) => {
            const meta = LEVEL_META[entry.level]
            const Icon = meta.icon
            return (
              <li key={entry.id} className="flex items-start gap-2.5 text-sm leading-snug">
                <time dateTime={entry.timestamp} className="shrink-0 text-fg-2 tabular-nums">
                  {formatLogTime(entry.timestamp)}
                </time>
                <Icon aria-hidden className={cn('mt-0.5 size-3.5 shrink-0', meta.className)} />
                <span className="sr-only">{meta.label}:</span>
                {showCategory ? (
                  <span className="shrink-0 rounded-[5px] bg-raised px-1.5 text-xs leading-5 text-fg-2">{entry.category}</span>
                ) : null}
                <span className="min-w-0 break-words text-fg-2">{entry.message}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
