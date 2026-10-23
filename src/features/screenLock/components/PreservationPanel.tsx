import { Circle, CircleCheck, DatabaseBackup, Search } from 'lucide-react'
import { SectionTitle } from '@/components/layout/PageHeader'
import { AppSelect } from '@/components/ui/AppSelect'
import { AppSwitch } from '@/components/ui/AppSwitch'
import { Button } from '@/components/ui/Button'
import { ExternalLink } from '@/components/ui/ExternalLink'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { Panel } from '@/components/ui/Panel'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { OFFICIAL_LINKS } from '@/data/catalog'
import { cn } from '@/lib/cn'
import { useAppStore } from '@/store/appStore'
import { preservationChecklist, preservationReviewed, primaryPath, redirectFor } from '../engine'
import { PRESERVATION_RESULT_LABELS, type RecoveryCase } from '../model'
import { useScreenLockStore } from '../store'
import { optionsFrom, pick } from './options'

export const PRESERVATION_BANNER =
  'Data harus dipertahankan — jangan reset, wipe, flash, atau unlock bootloader sebelum keputusan pelanggan selesai.'

/** Jalur B — Data Preservation (DESIGN.md §19): read-only, untuk pelanggan yang mempertahankan data atau belum memutuskan. */
export function PreservationPanel({ c }: { c: RecoveryCase }) {
  const updatePreservation = useScreenLockStore((s) => s.updatePreservation)
  const update = useScreenLockStore((s) => s.update)
  const autoDetect = useAppStore((s) => s.autoDetect)
  const detection = useAppStore((s) => s.detection)
  const setPage = useAppStore((s) => s.setPage)
  const checklist = preservationChecklist(c)
  const redirect = redirectFor(c)
  const reviewed = preservationReviewed(c)
  const primary = primaryPath(c) === 'data_preservation'

  const captureDetectedDevice = useScreenLockStore((s) => s.captureDetectedDevice)
  const runDetection = async () => {
    await autoDetect()
    updatePreservation({ deviceDetectionRun: true })
    // Catat bukti perangkat nyata ke tiket (demo diabaikan di dalam store).
    captureDetectedDevice()
  }

  const links =
    c.brand === 'xiaomi'
      ? [OFFICIAL_LINKS.googleUnlockHelp, OFFICIAL_LINKS.xiaomiForgotScreenPassword, OFFICIAL_LINKS.xiaomiAccount]
      : [OFFICIAL_LINKS.googleUnlockHelp, OFFICIAL_LINKS.googleAccountRecovery]

  return (
    <Panel aria-labelledby="path-preserve-title" className={cn('@container p-5', primary && 'border-success/40')}>
      <div className="flex flex-wrap items-center gap-3">
        <DatabaseBackup aria-hidden className="size-5 text-success" />
        <SectionTitle id="path-preserve-title">Jalur B — Data Preservation</SectionTitle>
        {primary ? <StatusBadge tone="success">Jalur utama tiket ini</StatusBadge> : <StatusBadge>Opsional</StatusBadge>}
        {reviewed ? <StatusBadge tone="info">Ditinjau</StatusBadge> : null}
      </div>

      {primary ? (
        <InlineAlert tone="warning" title="Data Preservation" className="mt-3">
          {PRESERVATION_BANNER}
        </InlineAlert>
      ) : (
        <p className="mt-1 text-sm text-fg-muted">
          Pelanggan sudah menyetujui penghapusan data. Pemeriksaan di bawah tetap tersedia bila pelanggan ingin mencoba
          opsi non-destruktif terlebih dahulu.
        </p>
      )}

      <ul className="mt-4 space-y-2" aria-label="Checklist Data Preservation">
        {checklist.map((item) => (
          <li key={item.id} className="flex items-start gap-2.5 text-[15px] leading-snug">
            {item.done ? (
              <CircleCheck aria-hidden className="mt-0.5 size-[18px] shrink-0 text-success" />
            ) : (
              <Circle aria-hidden className="mt-0.5 size-[18px] shrink-0 text-fg-muted" />
            )}
            <span className={item.done ? 'text-fg' : 'text-fg-2'}>
              <span className="sr-only">{item.done ? 'Selesai: ' : 'Belum: '}</span>
              {item.label}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 grid gap-4 @[640px]:grid-cols-2">
        <AppSwitch
          label="Metode akses resmi sudah diperiksa"
          description="Mis. biometrik yang masih berfungsi atau kredensial alternatif resmi. Jangan menebak PIN/pola."
          checked={c.preservation.officialAccessChecked}
          onCheckedChange={(checked) => updatePreservation({ officialAccessChecked: checked })}
        />
        <div className="flex flex-col gap-1.5">
          <Button
            className="self-start"
            icon={<Search aria-hidden className="size-[18px]" />}
            loading={detection.status === 'detecting'}
            onClick={() => void runDetection()}
          >
            Jalankan deteksi perangkat
          </Button>
          <p className="text-xs text-fg-muted" aria-live="polite">
            {c.preservation.deviceDetectionRun
              ? `Sudah dijalankan: ${detection.message ?? 'Tidak dapat diverifikasi'}`
              : 'Deteksi hanya membaca status; tidak mengakses data pengguna.'}
          </p>
        </div>
      </div>

      <AppSelect
        className="mt-4 max-w-[420px]"
        label="Hasil Data Preservation"
        value={c.preservationResult}
        options={optionsFrom(PRESERVATION_RESULT_LABELS)}
        hint="Pilih berdasarkan bukti pemeriksaan, bukan dugaan."
        onValueChange={(value) => {
          const preservationResult = pick(PRESERVATION_RESULT_LABELS, value)
          if (preservationResult) update({ preservationResult })
        }}
      />

      {redirect ? (
        <InlineAlert tone="info" title="Bukan masalah kunci layar" className="mt-4">
          {redirect.message}{' '}
          {redirect.target ? (
            <button
              type="button"
              className="focus-ring rounded-ui-sm font-medium text-cyan underline-offset-4 hover:underline"
              onClick={() => setPage(redirect.target === 'frp-recovery' ? 'frp-recovery' : 'tools')}
            >
              Buka {redirect.target === 'frp-recovery' ? 'FRP Recovery' : 'Tools'}
            </button>
          ) : null}
        </InlineAlert>
      ) : null}

      {c.preservationResult === 'no_non_destructive_option' ? (
        <InlineAlert tone="warning" title="Batasan" className="mt-4">
          Tidak ada metode resmi yang terverifikasi untuk membuka layar sambil mempertahankan data. Pilihannya: rujuk ke
          layanan resmi, atau reset bila pelanggan mengubah keputusan dan memberikan persetujuan baru.
        </InlineAlert>
      ) : null}
      {c.preservationResult === 'official_option_found' ? (
        <InlineAlert tone="success" title="Opsi resmi tersedia" className="mt-4">
          Gunakan opsi resmi tersebut terlebih dahulu sebelum mempertimbangkan reset.
        </InlineAlert>
      ) : null}

      <div className="mt-4">
        <p className="text-sm font-medium text-fg-2">Rujukan resmi</p>
        <ul className="mt-1.5 space-y-1 text-sm">
          {links.map((link) => (
            <li key={link.id}>
              <ExternalLink link={link} />
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  )
}
