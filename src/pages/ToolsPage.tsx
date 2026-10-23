import { Terminal } from 'lucide-react'
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

type ToolsResult = NativeResult<{ adb: string | null; fastboot: string | null }>

export function ToolsPage() {
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<ToolsResult | null>(null)

  const runCheck = async () => {
    setChecking(true)
    try {
      setResult(await nativeService.checkPlatformTools())
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Tools"
        description="Pemeriksaan ketersediaan dan versi Android SDK Platform-Tools (ADB/Fastboot)."
      />

      <Panel aria-labelledby="tools-check-title" className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Terminal aria-hidden className="size-5 text-cyan" />
            <SectionTitle id="tools-check-title">ADB &amp; Fastboot</SectionTitle>
            {result === null ? <StatusBadge>Belum diperiksa</StatusBadge> : null}
            {result?.kind === 'unavailable' ? <StatusBadge tone="warning">Tidak dapat diperiksa</StatusBadge> : null}
            {result?.kind === 'error' ? <StatusBadge tone="danger">Error</StatusBadge> : null}
            {result?.kind === 'ok' ? <StatusBadge tone="success">Diperiksa</StatusBadge> : null}
          </div>
          <Button loading={checking} onClick={() => void runCheck()}>
            Periksa ADB/Fastboot
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
          {result?.kind === 'ok' ? (
            <dl className="grid max-w-[560px] grid-cols-[140px_1fr] gap-y-2 text-[15px]">
              <dt className="text-fg-2">ADB</dt>
              <dd className="font-semibold text-fg">{result.value.adb ?? 'Tidak ditemukan'}</dd>
              <dt className="text-fg-2">Fastboot</dt>
              <dd className="font-semibold text-fg">{result.value.fastboot ?? 'Tidak ditemukan'}</dd>
            </dl>
          ) : null}
          {result === null ? (
            <p className="text-[15px] text-fg-2">
              Aplikasi tetap dapat dibuka tanpa ADB. Untuk diagnosis perangkat, pasang Platform-Tools resmi lalu jalankan
              pemeriksaan.
            </p>
          ) : null}
        </div>
      </Panel>

      <Panel aria-labelledby="tools-docs-title" className="p-5">
        <SectionTitle id="tools-docs-title">Dokumentasi resmi</SectionTitle>
        <ul className="mt-3 space-y-2 text-[15px]">
          {[OFFICIAL_LINKS.platformTools, OFFICIAL_LINKS.oemUsbDrivers].map((link) =>
            link ? (
              <li key={link.id}>
                <ExternalLink href={link.url}>{link.label}</ExternalLink>
                <span className="ml-2 text-sm text-fg-muted">{link.description}</span>
              </li>
            ) : null,
          )}
        </ul>
        <p className="mt-4 text-sm text-fg-muted">
          Aplikasi tidak mengunduh atau menjalankan binary dari sumber tidak resmi.
        </p>
      </Panel>
    </div>
  )
}
