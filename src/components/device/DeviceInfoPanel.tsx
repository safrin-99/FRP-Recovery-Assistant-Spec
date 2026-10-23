import { PlugZap, Search } from 'lucide-react'
import { AUTHORIZATION_LABELS, TRANSPORT_LABELS } from '@/lib/deviceLabels'
import { cn } from '@/lib/cn'
import { orUnknown } from '@/lib/format'
import { selectActiveDevice, useAppStore } from '@/store/appStore'
import type { DeviceSnapshot } from '@/types/domain'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel } from '@/components/ui/Panel'
import { DemoBadge } from '@/components/ui/StatusBadge'

/**
 * Status FRP tidak dapat dibaca secara sah melalui ADB/Fastboot standar, jadi tidak
 * pernah ditebak (PRD §7.2, DESIGN.md §9) — termasuk pada mode demo.
 */
export const FRP_STATUS_UNVERIFIED = 'Tidak dapat diverifikasi'

export function deviceRows(device: DeviceSnapshot): Array<{ label: string; value: string; tone?: 'warning' }> {
  return [
    { label: 'Brand', value: orUnknown(device.brand) },
    { label: 'Model', value: orUnknown(device.model) },
    { label: 'Kode Model', value: orUnknown(device.modelCode) },
    { label: 'Android Version', value: orUnknown(device.androidVersion) },
    { label: 'Security Patch', value: orUnknown(device.securityPatch) },
    { label: 'Status FRP', value: FRP_STATUS_UNVERIFIED, tone: 'warning' },
    { label: 'Connection', value: TRANSPORT_LABELS[device.transport] },
    { label: 'Otorisasi', value: AUTHORIZATION_LABELS[device.authorization] },
  ]
}

function PhoneGlyph() {
  return (
    <svg viewBox="0 0 44 84" aria-hidden className="h-[84px] w-[44px] shrink-0">
      <defs>
        <linearGradient id="device-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1689ff" />
          <stop offset="1" stopColor="#1558f5" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="42" height="82" rx="7" fill="#0b1420" stroke="#42617f" strokeWidth="2" />
      <rect x="5" y="6" width="34" height="72" rx="4" fill="url(#device-screen)" />
    </svg>
  )
}

export function DeviceInfoPanel({ className }: { className?: string }) {
  const device = useAppStore(selectActiveDevice)
  const detection = useAppStore((s) => s.detection)
  const autoDetect = useAppStore((s) => s.autoDetect)

  return (
    <Panel aria-labelledby="device-info-title" className={cn('@container flex min-h-0 flex-col px-5 py-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 id="device-info-title" className="text-[19px] font-semibold text-fg">
          Informasi Perangkat
        </h2>
        {device?.source === 'demo' ? <DemoBadge /> : null}
      </div>

      {device ? (
        <div className="mt-3.5 flex min-h-0 gap-5">
          {/* Ilustrasi disembunyikan saat panel sempit agar nilai tidak terpotong. */}
          <div className="hidden pt-1 pl-1 @[330px]:block">
            <PhoneGlyph />
          </div>
          <dl className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-[clamp(2px,0.45vh,6px)] text-[15px]">
            {deviceRows(device)
              .filter((row) => row.label !== 'Otorisasi')
              .map((row) => (
                <div key={row.label} className="contents">
                  <dt className="whitespace-nowrap text-fg-2">{row.label}</dt>
                  <dd
                    className={cn(
                      'min-w-0 font-semibold',
                      row.tone === 'warning' ? 'leading-snug text-warning' : 'truncate text-fg',
                    )}
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
          </dl>
        </div>
      ) : (
        <EmptyState
          className="flex-1"
          icon={PlugZap}
          title="Tidak ada perangkat"
          description={
            detection.status === 'error' && detection.message
              ? detection.message
              : 'Hubungkan perangkat via USB, lalu jalankan Auto Detect.'
          }
          action={
            <Button
              size="sm"
              icon={<Search aria-hidden className="size-4" />}
              loading={detection.status === 'detecting'}
              onClick={() => void autoDetect()}
            >
              Auto Detect
            </Button>
          }
        />
      )}
    </Panel>
  )
}
