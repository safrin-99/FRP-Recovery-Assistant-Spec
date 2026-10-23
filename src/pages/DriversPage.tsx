import { Cpu } from 'lucide-react'
import { useState } from 'react'
import { OFFICIAL_LINKS } from '@/data/catalog'
import { nativeService } from '@/services/nativeService'
import type { NativeResult } from '@/types/domain'
import { PageHeader, SectionTitle } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { ExternalLink } from '@/components/ui/ExternalLink'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { Panel } from '@/components/ui/Panel'
import { StatusBadge } from '@/components/ui/StatusBadge'

const STEPS = [
  'Gunakan kabel data (bukan kabel khusus pengisian) dan port USB langsung di komputer.',
  'Aktifkan Opsi Pengembang dan USB debugging pada perangkat, lalu izinkan komputer saat diminta.',
  'Pasang driver USB dari situs resmi produsen perangkat Anda.',
  'Buka Device Manager Windows dan pastikan perangkat tidak bertanda peringatan.',
]

export function DriversPage() {
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<NativeResult<{ summary: string }> | null>(null)

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
        description="Status driver USB yang dapat dideteksi dan panduan pemasangan dari produsen resmi."
      />

      <Panel aria-labelledby="driver-status-title" className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Cpu aria-hidden className="size-5 text-cyan" />
            <SectionTitle id="driver-status-title">Status driver</SectionTitle>
            {result === null ? <StatusBadge>Belum diperiksa</StatusBadge> : null}
            {result?.kind === 'unavailable' ? <StatusBadge tone="warning">Tidak dapat diperiksa</StatusBadge> : null}
            {result?.kind === 'error' ? <StatusBadge tone="danger">Error</StatusBadge> : null}
            {result?.kind === 'ok' ? <StatusBadge tone="success">Diperiksa</StatusBadge> : null}
          </div>
          <Button loading={checking} onClick={() => void runCheck()}>
            Periksa driver
          </Button>
        </div>
        <div className="mt-4">
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
          {result?.kind === 'ok' ? <p className="text-[15px] text-fg">{result.value.summary}</p> : null}
          {result === null ? (
            <p className="text-[15px] text-fg-2">
              Aplikasi tidak memasang driver secara otomatis. Installer driver hanya dijalankan oleh Anda sendiri dari
              sumber resmi.
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
        {OFFICIAL_LINKS.oemUsbDrivers ? (
          <p className="mt-4 text-[15px]">
            <ExternalLink href={OFFICIAL_LINKS.oemUsbDrivers.url}>{OFFICIAL_LINKS.oemUsbDrivers.label}</ExternalLink>
          </p>
        ) : null}
      </Panel>
    </div>
  )
}
