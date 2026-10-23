import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'demo'

const TONES: Record<BadgeTone, string> = {
  success: 'bg-success-soft text-success border-success/30',
  warning: 'bg-warning-soft text-warning border-warning/30',
  danger: 'bg-danger-soft text-danger border-danger/30',
  info: 'bg-info-soft text-cyan border-cyan/30',
  neutral: 'bg-raised text-fg-2 border-line-default',
  demo: 'bg-warning-soft text-warning border-warning/50 tracking-wider uppercase',
}

/** Status selalu memuat teks (dan ikon opsional) — tidak hanya warna (DESIGN.md §11). */
export function StatusBadge({
  tone = 'neutral',
  icon: Icon,
  children,
  className,
}: {
  tone?: BadgeTone
  icon?: LucideIcon
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {Icon ? <Icon aria-hidden className="size-3.5" /> : null}
      {children}
    </span>
  )
}

/** Badge DEMO yang wajib tampil di setiap area yang memuat data contoh. */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <StatusBadge tone="demo" className={className}>
      DEMO
    </StatusBadge>
  )
}
