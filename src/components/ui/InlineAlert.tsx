import { CircleCheck, CircleX, Info, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'info' | 'success' | 'warning' | 'danger'

const TONES: Record<Tone, { box: string; icon: LucideIcon; label: string }> = {
  info: { box: 'border-cyan/35 bg-info-soft', icon: Info, label: 'Info' },
  success: { box: 'border-success/35 bg-success-soft', icon: CircleCheck, label: 'Berhasil' },
  warning: { box: 'border-warning/40 bg-warning-soft', icon: TriangleAlert, label: 'Peringatan' },
  danger: { box: 'border-danger/45 bg-danger-soft', icon: CircleX, label: 'Error' },
}

const ICON_COLOR: Record<Tone, string> = {
  info: 'text-cyan',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
}

/** Pesan inline: selalu ada ikon + label teks (bukan hanya warna). */
export function InlineAlert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: Tone
  title?: string
  children: ReactNode
  className?: string
}) {
  const { box, icon: Icon, label } = TONES[tone]
  return (
    <div
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-ui-md border px-4 py-3', box, className)}
    >
      <Icon aria-hidden className={cn('mt-0.5 size-[18px] shrink-0', ICON_COLOR[tone])} />
      <div className="min-w-0 text-sm leading-relaxed text-fg-2">
        <p className="font-semibold text-fg">
          <span className="sr-only">{label}: </span>
          {title}
        </p>
        <div>{children}</div>
      </div>
    </div>
  )
}
