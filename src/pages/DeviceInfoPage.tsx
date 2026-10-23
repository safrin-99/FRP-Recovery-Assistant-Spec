import { PlugZap, Search } from 'lucide-react'
import { deviceRows } from '@/components/device/DeviceInfoPanel'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { Panel } from '@/components/ui/Panel'
import { DemoBadge, StatusBadge } from '@/components/ui/StatusBadge'
import { selectActiveDevice, useAppStore } from '@/store/appStore'

export function DeviceInfoPage() {
  const device = useAppStore(selectActiveDevice)
  const detection = useAppStore((s) => s.detection)
  const autoDetect = useAppStore((s) => s.autoDetect)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Device Info"
        description="Informasi non-sensitif yang dapat dibaca dari perangkat. Nilai yang tidak tersedia ditampilkan sebagai —."
        actions={
          <Button
            icon={<Search aria-hidden className="size-[18px]" />}
            loading={detection.status === 'detecting'}
            onClick={() => void autoDetect()}
          >
            Auto Detect
          </Button>
        }
      />

      {detection.status === 'error' && detection.message ? (
        <InlineAlert tone="warning" title="Deteksi tidak tersedia">
          {detection.message}
        </InlineAlert>
      ) : null}

      <Panel aria-labelledby="device-detail-title" className="p-5">
        <div className="flex items-center gap-3">
          <h2 id="device-detail-title" className="text-[19px] font-semibold text-fg">
            Detail perangkat
          </h2>
          {device?.source === 'demo' ? <DemoBadge /> : null}
          {device?.source === 'live' ? <StatusBadge tone="info">Terdeteksi</StatusBadge> : null}
        </div>

        {device ? (
          <dl className="mt-4 grid max-w-[720px] grid-cols-[minmax(160px,220px)_1fr] gap-x-6 gap-y-0 text-[15px]">
            {deviceRows(device).map((row) => (
              <div key={row.label} className="contents">
                <dt className="border-b border-line py-2.5 text-fg-2">{row.label}</dt>
                <dd
                  className={
                    row.tone === 'warning'
                      ? 'border-b border-line py-2.5 font-semibold text-warning'
                      : 'border-b border-line py-2.5 font-semibold text-fg'
                  }
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <EmptyState
            icon={PlugZap}
            title="Tidak ada perangkat"
            description="Hubungkan perangkat via USB dan izinkan USB debugging bila diminta, lalu jalankan Auto Detect."
          />
        )}

        {device?.source === 'demo' ? (
          <p className="mt-4 text-sm text-fg-muted">
            Data di atas adalah contoh untuk pratinjau UI, bukan hasil pembacaan perangkat nyata.
          </p>
        ) : null}
      </Panel>

      <InlineAlert tone="info" title="Tentang Status FRP">
        Status FRP tidak dapat dibaca secara andal melalui koneksi ADB/Fastboot standar, sehingga aplikasi menampilkan
        &ldquo;Tidak dapat diverifikasi&rdquo; dan tidak menebak.
      </InlineAlert>
    </div>
  )
}
