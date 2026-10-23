import { Terminal } from 'lucide-react'
import { useState } from 'react'
import { OFFICIAL_LINKS } from '@/data/catalog'
import { nativeService, type PlatformToolsStatus } from '@/services/nativeService'
import type { NativeResult } from '@/types/domain'
import { PageHeader, SectionTitle } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { ExternalLink } from '@/components/ui/ExternalLink'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { Panel } from '@/components/ui/Panel'
import { StatusBadge } from '@/components/ui/StatusBadge'

function ToolRow({ name, info }: { name: string; info: PlatformToolsStatus['adb'] }) {
  return (
    <div className="contents">
      <dt className="py-2 text-fg-2">{name}</dt>
      <dd className="py-2">
        {info ? (
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="flex items-center gap-2 font-semibold text-fg">
              {info.version}
              <StatusBadge tone="success">Terdeteksi</StatusBadge>
            </span>
            <span className="truncate text-sm text-fg-muted">{info.path}</span>
          </div>
        ) : (
          <span className="flex items-center gap-2 font-semibold text-fg">
            Tidak ditemukan
            <StatusBadge tone="warning">Perlu dipasang</StatusBadge>
          </span>
        )}
      </dd>
    </div>
  )
}

export function ToolsPage() {
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<NativeResult<PlatformToolsStatus> | null>(null)

  const runCheck = async () => {
    setChecking(true)
    try {
      setResult(await nativeService.checkPlatformTools())
    } finally {
      setChecking(false)
    }
  }

  const missingAny = result?.kind === 'ok' && (!result.value.adb || !result.value.fastboot)

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
            {result?.kind === 'ok' ? <StatusBadge tone={missingAny ? 'warning' : 'success'}>Diperiksa</StatusBadge> : null}
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
            <>
              <dl className="grid max-w-[760px] grid-cols-[120px_minmax(0,1fr)] gap-x-4 text-[15px]">
                <ToolRow name="ADB" info={result.value.adb} />
                <ToolRow name="Fastboot" info={result.value.fastboot} />
              </dl>
              {missingAny ? (
                <InlineAlert tone="warning" title="Platform-Tools belum lengkap" className="mt-3">
                  Unduh Android SDK Platform-Tools dari situs resmi, lalu tambahkan folder platform-tools ke PATH dan
                  periksa lagi.
                </InlineAlert>
              ) : null}
            </>
          ) : null}
          {result === null ? (
            <p className="text-[15px] text-fg-2">
              Aplikasi tetap dapat dibuka tanpa ADB. Untuk diagnosis perangkat, pasang Platform-Tools resmi lalu jalankan
              pemeriksaan. Lokasi yang dicari: PATH, ANDROID_HOME/ANDROID_SDK_ROOT, folder Android SDK bawaan, dan
              instalasi winget.
            </p>
          ) : null}
        </div>
      </Panel>

      <Panel aria-labelledby="tools-docs-title" className="p-5">
        <SectionTitle id="tools-docs-title">Dokumentasi resmi</SectionTitle>
        <ul className="mt-3 space-y-2 text-[15px]">
          {[OFFICIAL_LINKS.platformTools, OFFICIAL_LINKS.oemUsbDrivers].map((link) => (
            <li key={link.id}>
              <ExternalLink link={link} />
              <span className="ml-2 text-sm text-fg-muted">{link.description}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-fg-muted">
          Aplikasi tidak mengunduh atau menjalankan binary dari sumber tidak resmi.
        </p>
      </Panel>
    </div>
  )
}
