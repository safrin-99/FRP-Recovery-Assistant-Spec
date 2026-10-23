import { DatabaseBackup, FilePlus2, OctagonAlert } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { Panel } from '@/components/ui/Panel'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { CaseIntakePanel } from '@/features/screenLock/components/CaseIntakePanel'
import { CaseRecordPanel } from '@/features/screenLock/components/CaseRecordPanel'
import { PRESERVATION_BANNER, PreservationPanel } from '@/features/screenLock/components/PreservationPanel'
import { RESET_CARD_LABEL, ResetPanel } from '@/features/screenLock/components/ResetPanel'
import { primaryPath } from '@/features/screenLock/engine'
import { useScreenLockStore } from '@/features/screenLock/store'
import { selectActiveDevice, useAppStore } from '@/store/appStore'

/**
 * Screen Lock Recovery (PRD v2.4 §7.2, DESIGN.md §19): jalur dipilih per tiket dari preferensi
 * data pelanggan. Guided Factory Reset (Jalur A) menjadi jalur utama hanya setelah pelanggan
 * eksplisit setuju hapus data; selain itu Data Preservation (Jalur B). Tidak ada aksi destruktif
 * yang dikirim ke perangkat.
 */
export function ScreenLockRecoveryPage() {
  const current = useScreenLockStore((s) => s.current)
  const dirty = useScreenLockStore((s) => s.save.dirty)
  const startCase = useScreenLockStore((s) => s.startCase)
  const brand = useAppStore((s) => s.brand)
  const device = useAppStore(selectActiveDevice)
  const [confirmNew, setConfirmNew] = useState(false)

  const begin = () => startCase(brand, device)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Screen Lock Recovery"
        description="Untuk keluhan lupa PIN/pola/sandi layar. Jalur dipilih per tiket dari keputusan pelanggan: panduan reset resmi bila pelanggan setuju hapus data, Data Preservation bila data harus dipertahankan atau belum diputuskan."
        actions={
          current ? (
            <>
              <StatusBadge tone="info">{current.ticketCode}</StatusBadge>
              <Button
                icon={<FilePlus2 aria-hidden className="size-[18px]" />}
                onClick={() => (dirty ? setConfirmNew(true) : begin())}
              >
                Tiket baru
              </Button>
            </>
          ) : null
        }
      />

      {current ? (
        // `key` mengosongkan state lokal panel (mis. draft model) saat tiket berganti.
        <div key={current.id} className="@container">
          <div className="grid items-start gap-4 @[920px]:grid-cols-[minmax(0,1fr)_320px] @[1180px]:grid-cols-[minmax(0,1fr)_380px]">
            <div className="flex min-w-0 flex-col gap-4">
              <CaseIntakePanel c={current} />
              {current.dataPreference === null ? (
                <InlineAlert tone="info" title="Tanyakan keputusan pelanggan">
                  Pilih preferensi data pelanggan untuk tiket ini. Sampai dipilih, reset tetap nonaktif dan Data
                  Preservation dipakai.
                </InlineAlert>
              ) : null}
              {primaryPath(current) === 'guided_factory_reset' ? (
                <>
                  <ResetPanel c={current} />
                  <PreservationPanel c={current} />
                </>
              ) : (
                <>
                  <PreservationPanel c={current} />
                  <ResetPanel c={current} />
                </>
              )}
            </div>
            <CaseRecordPanel c={current} />
          </div>
        </div>
      ) : (
        <Panel aria-labelledby="slr-start-title" className="@container p-6">
          <h2 id="slr-start-title" className="text-[19px] font-semibold text-fg">
            Mulai tiket
          </h2>
          <p className="mt-1 max-w-[70ch] text-[15px] leading-relaxed text-fg-2">
            Nomor tiket dibuat aplikasi. Setiap tiket meminta keputusan pelanggan sendiri — persetujuan tidak pernah
            diambil dari tiket lain. Catatan hanya ada selama sesi aplikasi terbuka sampai Anda menyimpannya ke Supabase.
          </p>
          <div className="mt-4 grid gap-3 @[640px]:grid-cols-2">
            <article className="rounded-ui-md border border-danger/35 bg-panel px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <OctagonAlert aria-hidden className="size-5 text-danger" />
                <h3 className="text-base font-semibold text-fg">Jalur A — Guided Factory Reset</h3>
                <StatusBadge tone="danger">{RESET_CARD_LABEL}</StatusBadge>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-fg-2">
                Bila pelanggan setuju hapus data: preflight, kesiapan akun Google/Xiaomi, persetujuan eksplisit, lalu
                panduan resmi sesuai merek/model.
              </p>
            </article>
            <article className="rounded-ui-md border border-success/40 bg-success-soft px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <DatabaseBackup aria-hidden className="size-5 text-success" />
                <h3 className="text-base font-semibold text-fg">Jalur B — Data Preservation</h3>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-fg-2">{PRESERVATION_BANNER}</p>
            </article>
          </div>
          <Button variant="solid" className="mt-5" icon={<FilePlus2 aria-hidden className="size-[18px]" />} onClick={begin}>
            Mulai tiket baru
          </Button>
        </Panel>
      )}

      <ConfirmDialog
        open={confirmNew}
        onOpenChange={setConfirmNew}
        tone="primary"
        title="Mulai tiket baru?"
        description="Tiket yang sedang terbuka memiliki perubahan yang belum tersimpan ke cloud."
        impact="Catatan di layar akan diganti tiket baru dengan keputusan pelanggan yang kosong. Simpan ke Supabase terlebih dahulu bila perlu."
        confirmLabel="Mulai tiket baru"
        onConfirm={begin}
      />
    </div>
  )
}
