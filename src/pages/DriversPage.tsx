import { Cpu } from 'lucide-react'
import { useState } from 'react'
import { OFFICIAL_LINKS } from '@/data/catalog'
import { nativeService, type DriverEntry, type DriverReport } from '@/services/nativeService'
import type { NativeResult } from '@/types/domain'
import { PageHeader, SectionTitle } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { ExternalLink } from '@/components/ui/ExternalLink'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { Panel } from '@/components/ui/Panel'
import { StatusBadge, type BadgeTone } from '@/components/ui/StatusBadge'

const STEPS = [
  'Gunakan kabel data (bukan kabel khusus pengisian) dan port USB langsung di komputer.',
  'Aktifkan Opsi Pengembang dan USB debugging pada perangkat, lalu izinkan komputer saat diminta.',
  'Pasang driver USB dari situs resmi produsen perangkat Anda.',
  'Buka Device Manager Windows dan pastikan perangkat tidak bertanda peringatan.',
]

const INTERFACE_LABELS: Record<DriverEntry['interface'], string> = {
  adb: 'Antarmuka ADB',
  fastboot: 'Antarmuka Fastboot',
  'android-usb': 'Perangkat USB Android',
}

const STATUS_META: Record<DriverEntry['status'], { tone: BadgeTone; label: string }> = {
  ok: { tone: 'success', label: 'Driver aktif' },
  problem: { tone: 'danger', label: 'Bermasalah' },
  disabled: { tone: 'warning', label: 'Dinonaktifkan' },
  unknown: { tone: 'neutral', label: 'Tidak diketahui' },
}

const LEVEL_TONE: Record<DriverReport['level'], 'success' | 'warning' | 'info'> = {
  ok: 'success',
  warning: 'warning',
  info: 'info',
}

export function DriversPage() {
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<NativeResult<DriverReport> | null>(null)

  const runCheck = async () => {
    setChecking(true)
    try {
      setResult(await nativeService.checkDriverStatus())
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Drivers"
        description="Status driver USB Android yang terlihat di Device Manager Windows, serta panduan pemasangan dari produsen resmi."
      />

      <Panel aria-labelledby="driver-status-title" className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Cpu aria-hidden className="size-5 text-cyan" />
            <SectionTitle id="driver-status-title">Status driver</SectionTitle>
            {result === null ? <StatusBadge>Belum diperiksa</StatusBadge> : null}
            {result?.kind === 'unavailable' ? <StatusBadge tone="warning">Tidak dapat diperiksa</StatusBadge> : null}
            {result?.kind === 'error' ? <StatusBadge tone="danger">Error</StatusBadge> : null}
            {result?.kind === 'ok' ? <StatusBadge tone="info">Diperiksa</StatusBadge> : null}
          </div>
          <Button loading={checking} onClick={() => void runCheck()}>
            Periksa driver
          </Button>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          {result?.kind === 'unavailable' ? (
            <InlineAlert tone="warning" title="Pemeriksaan belum tersedia">
              {result.reason}
            </InlineAlert>
          ) : null}
          {result?.kind === 'error' ? (
            <InlineAlert tone="danger" title="Pemeriksaan gagal">
              {result.message}
            </InlineAlert>
          ) : null}
          {result?.kind === 'ok' ? (
            <>
              <InlineAlert tone={LEVEL_TONE[result.value.level]} title="Ringkasan">
                {result.value.summary}
              </InlineAlert>
              {result.value.entries.length > 0 ? (
                <ul className="divide-y divide-line rounded-ui-md border border-line">
                  {result.value.entries.map((entry, index) => (
                    <li key={`${entry.name}-${index}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-fg">{entry.name}</p>
                        <p className="text-sm text-fg-muted">
                          {INTERFACE_LABELS[entry.interface]}
                          {entry.vendorGuess ? ` · Dugaan merek: ${entry.vendorGuess}` : ''}
                          {entry.problemCode !== null ? ` · Kode masalah ${entry.problemCode}` : ''}
                        </p>
                      </div>
                      <StatusBadge tone={STATUS_META[entry.status].tone}>{STATUS_META[entry.status].label}</StatusBadge>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : null}
          {result === null ? (
            <p className="text-[15px] text-fg-2">
              Aplikasi hanya membaca daftar perangkat Windows dan tidak memasang driver. Installer driver hanya
              dijalankan oleh Anda sendiri dari sumber resmi.
            </p>
          ) : null}
        </div>
      </Panel>

      <Panel aria-labelledby="driver-steps-title" className="p-5">
        <SectionTitle id="driver-steps-title">Langkah pemeriksaan manual</SectionTitle>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-fg-2">
          {STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="mt-4 text-[15px]">
          <ExternalLink link={OFFICIAL_LINKS.oemUsbDrivers} />
        </p>
      </Panel>
    </div>
  )
}
