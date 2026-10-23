import * as Dialog from '@radix-ui/react-dialog'
import { CloudUpload, History, LogOut, RefreshCw, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AccountDialog } from '@/components/cloud/AccountDialog'
import { CloudStatusBadge } from '@/components/cloud/CloudStatusBadge'
import { SectionTitle } from '@/components/layout/PageHeader'
import { AppSelect } from '@/components/ui/AppSelect'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { Panel } from '@/components/ui/Panel'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { BRAND_LABELS } from '@/data/catalog'
import type { CloudCase } from '@/services/supabase/recoveryCasesRepo'
import { useCloudStore } from '@/store/cloudStore'
import type { BrandId } from '@/types/domain'
import { allowedOutcomes, caseStatus, caseSummary, chosenPath } from '../engine'
import { CASE_STATUS_LABELS, CHOSEN_PATH_LABELS, OUTCOME_LABELS, type Outcome, type RecoveryCase } from '../model'
import { useScreenLockStore } from '../store'
import { pick } from './options'

const STORED = [
  'Nomor tiket, merek, dan model perangkat',
  'Tipe masalah, kondisi akses, preferensi data, status backup',
  'Status kesiapan akun pasca-reset (tanpa email/kata sandi)',
  'Izin pemilik serta persetujuan reset beserta waktu dan versi teks',
  'Jalur, status, dan ringkasan hasil terstruktur',
]
const NOT_STORED = [
  'PIN, pola, kata sandi, OTP, kode pemulihan, atau token',
  'Email/username akun Google/Xiaomi pelanggan',
  'IMEI, serial perangkat, atau identitas pelanggan',
  'Isi data pengguna dan log mentah perangkat',
]

const timeFormat = (iso: string) => new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })

/** Catatan kasus + simpan ke `recovery_cases` (DESIGN.md §18/§19). Tersimpan hanya setelah server mengonfirmasi. */
export function CaseRecordPanel({ c }: { c: RecoveryCase }) {
  const chooseOutcome = useScreenLockStore((s) => s.chooseOutcome)
  const allowed = allowedOutcomes(c)
  const path = chosenPath(c)

  return (
    <Panel aria-labelledby="record-title" className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionTitle id="record-title">Catatan kasus</SectionTitle>
        <CloudStatusBadge />
      </div>
      <div className="flex flex-wrap gap-2">
        <StatusBadge tone={path === 'guided_factory_reset' ? 'danger' : 'info'}>{CHOSEN_PATH_LABELS[path]}</StatusBadge>
        <StatusBadge>{CASE_STATUS_LABELS[caseStatus(c)]}</StatusBadge>
      </div>

      <div aria-label="Ringkasan kasus" className="rounded-ui-md border border-line-default bg-field px-3.5 py-3 text-sm">
        {caseSummary(c)
          .split('\n')
          .map((line, index) => (
            <p key={index} className={index === 0 ? 'font-semibold break-words text-fg' : 'mt-1 break-words text-fg-2'}>
              {line}
            </p>
          ))}
      </div>

      <AppSelect
        label="Hasil kasus"
        value={c.outcome}
        options={(Object.keys(OUTCOME_LABELS) as Outcome[]).map((outcome) => ({
          value: outcome,
          label: OUTCOME_LABELS[outcome],
          disabled: !allowed.includes(outcome),
          description: allowed.includes(outcome) ? undefined : 'Butuh bukti: checklist pasca-reset lengkap atau opsi resmi berhasil',
        }))}
        hint="Jangan menyatakan berhasil sebelum layar setup/home benar-benar diverifikasi."
        onValueChange={(value) => {
          const outcome = pick(OUTCOME_LABELS, value)
          if (outcome) chooseOutcome(outcome)
        }}
      />

      <CloudSaveSection c={c} />
      <CloudHistorySection />
    </Panel>
  )
}

function CloudSaveSection({ c }: { c: RecoveryCase }) {
  const status = useCloudStore((s) => s.status)
  const online = useCloudStore((s) => s.online)
  const email = useCloudStore((s) => s.email)
  const configMessage = useCloudStore((s) => s.configMessage)
  const saveConsentGiven = useCloudStore((s) => s.saveConsentGiven)
  const giveSaveConsent = useCloudStore((s) => s.giveSaveConsent)
  const signOut = useCloudStore((s) => s.signOut)
  const save = useScreenLockStore((s) => s.save)
  const saveToCloud = useScreenLockStore((s) => s.saveToCloud)
  const [guest, setGuest] = useState(false)
  const [consentOpen, setConsentOpen] = useState(false)

  if (status === 'not_configured' || status === 'invalid_config') {
    return (
      <InlineAlert tone="warning" title="Belum tersimpan ke cloud">
        {status === 'not_configured'
          ? 'Supabase belum dikonfigurasi pada build ini. Catatan kasus hanya ada selama sesi aplikasi terbuka.'
          : (configMessage ?? 'Konfigurasi Supabase tidak valid.')}
      </InlineAlert>
    )
  }

  if (status !== 'signed_in') {
    return (
      <div className="flex flex-col gap-2.5">
        {status === 'session_expired' ? (
          <InlineAlert tone="warning" title="Sesi berakhir">
            Masuk lagi untuk menyimpan. Catatan kasus di layar tidak hilang.
          </InlineAlert>
        ) : null}
        {guest ? (
          <p className="text-sm text-fg-muted" role="status">
            Mode tamu: belum tersimpan ke cloud. Catatan hanya ada selama sesi aplikasi terbuka.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <AccountDialog />
          {!guest ? (
            <Button size="sm" variant="ghost" onClick={() => setGuest(true)}>
              Lanjutkan sebagai tamu
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  const startSave = () => {
    if (!saveConsentGiven) setConsentOpen(true)
    else void saveToCloud()
  }

  let saveLine: string
  if (!online) saveLine = 'Offline — belum tersimpan ke cloud.'
  else if (c.issueType === null) saveLine = 'Pilih tipe masalah sebelum menyimpan. Belum tersimpan ke cloud.'
  else if (save.status === 'saving') saveLine = 'Menyimpan…'
  else if (save.status === 'failed') saveLine = `Gagal menyimpan: ${save.error ?? 'kesalahan tidak diketahui'}`
  else if (save.savedAt && !save.dirty) saveLine = `Tersimpan ${timeFormat(save.savedAt)}`
  else if (save.savedAt) saveLine = 'Ada perubahan yang belum tersimpan.'
  else saveLine = 'Belum tersimpan ke cloud.'

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex min-w-0 items-center justify-between gap-2 text-sm">
        <span className="min-w-0 truncate text-fg-2" title={email ?? undefined}>
          {email ?? 'Akun aplikasi'}
        </span>
        <Button size="sm" variant="ghost" icon={<LogOut aria-hidden className="size-4" />} onClick={() => void signOut()}>
          Keluar
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="solid"
          icon={<CloudUpload aria-hidden className="size-4" />}
          loading={save.status === 'saving'}
          disabled={!online || c.issueType === null}
          onClick={startSave}
        >
          {save.status === 'failed' ? 'Coba lagi' : 'Simpan ke Supabase'}
        </Button>
        {save.status === 'saved' && !save.dirty ? <StatusBadge tone="success">Tersimpan</StatusBadge> : null}
        {save.status === 'failed' ? <StatusBadge tone="danger">Gagal menyimpan</StatusBadge> : null}
      </div>
      <p className="text-xs leading-relaxed text-fg-muted" role="status" aria-live="polite">
        {saveLine}
      </p>

      <Dialog.Root open={consentOpen} onOpenChange={setConsentOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="animate-overlay fixed inset-0 z-[var(--z-dialog-overlay)] bg-black/60" />
          <Dialog.Content className="animate-popover fixed top-1/2 left-1/2 z-[var(--z-dialog)] w-[min(500px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-ui-xl border border-line-default bg-raised p-6 shadow-[var(--shadow-popover)]">
            <Dialog.Title className="text-lg font-semibold text-fg">Simpan catatan kasus ke Supabase?</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-relaxed text-fg-2">
              Tiket {c.ticketCode} disimpan ke akun aplikasi Anda dan hanya dapat dibaca oleh akun ini (RLS).
            </Dialog.Description>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="font-semibold text-fg">Disimpan</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-fg-2">
                  {STORED.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-fg">Tidak disimpan</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-fg-2">
                  {NOT_STORED.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close asChild>
                <Button variant="outline">Batal</Button>
              </Dialog.Close>
              <Button
                variant="solid"
                onClick={() => {
                  giveSaveConsent()
                  setConsentOpen(false)
                  void saveToCloud()
                }}
              >
                Simpan ke Supabase
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

function CloudHistorySection() {
  const status = useCloudStore((s) => s.status)
  const online = useCloudStore((s) => s.online)
  const history = useScreenLockStore((s) => s.history)
  const loadHistory = useScreenLockStore((s) => s.loadHistory)
  const deleteFromCloud = useScreenLockStore((s) => s.deleteFromCloud)
  const [pendingDelete, setPendingDelete] = useState<CloudCase | null>(null)
  const signedIn = status === 'signed_in'

  useEffect(() => {
    if (signedIn && online) void loadHistory()
  }, [signedIn, online, loadHistory])

  if (!signedIn) return null

  return (
    <section aria-labelledby="cloud-history-title" className="border-t border-line pt-4">
      <div className="flex items-center justify-between gap-2">
        <h3 id="cloud-history-title" className="text-base font-semibold text-fg">
          Riwayat cloud
        </h3>
        <Button
          size="sm"
          variant="ghost"
          aria-label="Muat ulang riwayat cloud"
          icon={<RefreshCw aria-hidden className="size-4" />}
          loading={history.status === 'loading'}
          disabled={!online}
          onClick={() => void loadHistory()}
        />
      </div>
      {history.error ? (
        <InlineAlert tone="danger" title="Riwayat tidak dapat dimuat" className="mt-2">
          {history.error}
        </InlineAlert>
      ) : null}
      {history.status === 'loading' && history.items.length === 0 ? (
        <div className="mt-3 space-y-2" aria-hidden>
          <div className="h-12 animate-pulse rounded-ui-md bg-field" />
          <div className="h-12 animate-pulse rounded-ui-md bg-field" />
        </div>
      ) : null}
      {history.status === 'loaded' && history.items.length === 0 ? (
        <EmptyState icon={History} title="Belum ada kasus tersimpan" description="Kasus muncul di sini setelah disimpan ke Supabase." />
      ) : null}
      {history.items.length > 0 ? (
        <ul className="mt-2 max-h-[280px] space-y-2 overflow-y-auto pr-1">
          {history.items.map((item) => {
            const brand = BRAND_LABELS[item.brand as BrandId] ?? item.brand
            const ticket = item.ticket_code ?? 'Tanpa nomor tiket'
            return (
              <li key={item.id} className="flex items-start gap-2 rounded-ui-md border border-line-default bg-field px-3 py-2">
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate font-medium text-fg">{ticket}</p>
                  <p className="truncate text-fg-muted">
                    {brand}
                    {item.model ? ` ${item.model}` : ''} · {CHOSEN_PATH_LABELS[item.chosen_path]} ·{' '}
                    {CASE_STATUS_LABELS[item.status]}
                  </p>
                  <p className="text-xs text-fg-muted">{timeFormat(item.updated_at)}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Hapus ${ticket} dari cloud`}
                  icon={<Trash2 aria-hidden className="size-4" />}
                  onClick={() => setPendingDelete(item)}
                />
              </li>
            )
          })}
        </ul>
      ) : null}
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        title="Hapus tiket dari cloud?"
        description={`Tiket ${pendingDelete?.ticket_code ?? ''} dihapus permanen dari Supabase untuk akun ini.`}
        impact="Catatan yang sedang terbuka di layar tidak ikut terhapus dan dapat disimpan ulang."
        confirmLabel="Hapus dari cloud"
        onConfirm={() => {
          if (pendingDelete) void deleteFromCloud(pendingDelete.id)
        }}
      />
    </section>
  )
}
