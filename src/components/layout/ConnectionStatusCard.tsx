import { CircleCheck, FlaskConical, PlugZap, Smartphone, TriangleAlert, type LucideIcon } from 'lucide-react'
import { AUTHORIZATION_LABELS, TRANSPORT_LABELS } from '@/lib/deviceLabels'
import { cn } from '@/lib/cn'
import { orUnknown } from '@/lib/format'
import { selectActiveDevice, useAppStore } from '@/store/appStore'
import { DemoBadge } from '@/components/ui/StatusBadge'

/**
 * Kartu koneksi di dasar sidebar (DESIGN.md §6). "Device Ready" hijau HANYA muncul
 * untuk perangkat live yang terotorisasi; mode demo selalu berbadge DEMO.
 */
export function ConnectionStatusCard() {
  const device = useAppStore(selectActiveDevice)

  let icon: LucideIcon = PlugZap
  let iconClass = 'text-fg-muted border-line-default'
  let title = 'Tidak ada perangkat'
  let subtitle = 'Hubungkan perangkat via USB'

  if (device?.source === 'demo') {
    icon = FlaskConical
    iconClass = 'text-warning border-warning/50'
    title = 'Mode Demo'
    subtitle = 'Bukan perangkat nyata'
  } else if (device?.source === 'live') {
    if (device.transport === 'fastboot') {
      icon = PlugZap
      iconClass = 'text-cyan border-cyan/50'
      title = 'Mode Fastboot'
      subtitle = `${TRANSPORT_LABELS[device.transport]} terdeteksi`
    } else if (device.authorization === 'authorized') {
      icon = CircleCheck
      iconClass = 'text-success border-success/50'
      title = 'Device Ready'
      subtitle = `${TRANSPORT_LABELS[device.transport]} terhubung`
    } else {
      icon = TriangleAlert
      iconClass = 'text-warning border-warning/50'
      title = AUTHORIZATION_LABELS[device.authorization]
      subtitle = `${TRANSPORT_LABELS[device.transport]} terdeteksi`
    }
  }
  const Icon = icon

  return (
    <div
      aria-live="polite"
      className="rounded-ui-lg border border-line bg-panel p-3 max-[1199px]:p-2"
      data-testid="connection-status"
    >
      <div className="flex items-center gap-3 max-[1199px]:justify-center">
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-full border-2', iconClass)}>
          <Icon aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 leading-tight max-[1199px]:sr-only">
          <p className="flex items-center gap-2 text-base font-semibold text-fg">
            <span className="truncate">{title}</span>
          </p>
          <p className="truncate text-sm text-fg-2">{subtitle}</p>
        </div>
      </div>
      {device ? (
        <div className="mt-3 flex items-center gap-3 border-t border-line pt-3 max-[1199px]:hidden">
          <Smartphone aria-hidden className="size-7 shrink-0 text-fg-muted" strokeWidth={1.5} />
          <div className="min-w-0 text-sm leading-snug text-fg-2">
            <p className="truncate">
              {orUnknown(device.brand)} {device.model ?? ''}
            </p>
            <p className="flex items-center gap-2">
              <span className="truncate">{orUnknown(device.modelCode)}</span>
              {device.source === 'demo' ? <DemoBadge /> : null}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
