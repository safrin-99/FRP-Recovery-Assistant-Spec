import * as Dialog from '@radix-ui/react-dialog'
import { CircleAlert, CircleCheck, Lock, OctagonAlert, TriangleAlert, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { SectionTitle } from '@/components/layout/PageHeader'
import { AppSelect } from '@/components/ui/AppSelect'
import { AppSwitch } from '@/components/ui/AppSwitch'
import { Button } from '@/components/ui/Button'
import { ExternalLink } from '@/components/ui/ExternalLink'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { Panel } from '@/components/ui/Panel'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { BRAND_LABELS, OFFICIAL_LINKS } from '@/data/catalog'
import { cn } from '@/lib/cn'
import {
  ACCOUNT_VERIFICATION_WARNING,
  canRequestConsent,
  postResetComplete,
  preflight,
  primaryPath,
  resetGateBlockers,
  type PreflightItem,
} from '../engine'
import { resolveCapability } from '../capabilities'
import { resolveResetGuide } from '../guide'
import { ACCOUNT_READINESS_LABELS, RESET_CONSENT_TEXT_VERSION, type PostResetChecklist, type RecoveryCase } from '../model'
import { useScreenLockStore } from '../store'
import { optionsFrom, pick } from './options'

export const CONSENT_CONFIRM_LABEL = 'Saya menyetujui panduan reset'
export const RESET_CARD_LABEL = 'Reset Resmi — Menghapus Data'

const PREFLIGHT_ICON: Record<PreflightItem['status'], { icon: LucideIcon; className: string; label: string }> = {
  ok: { icon: CircleCheck, className: 'text-success', label: 'Siap' },
  warning: { icon: TriangleAlert, className: 'text-warning', label: 'Peringatan' },
  blocked: { icon: CircleAlert, className: 'text-danger', label: 'Belum siap' },
}

const POST_RESET_ITEMS: Array<{ key: keyof PostResetChecklist; label: string; description: string }> = [
  {
    key: 'setupCompleted',
    label: 'Setup awal selesai dan layar setup/home terverifikasi',
    description: 'Jangan menandai selesai sebelum perangkat benar-benar melewati setup/aktivasi.',
  },
  {
    key: 'accountActivated',
    label: 'Aktivasi dengan akun Google/Xiaomi yang benar selesai',
    description: 'Verifikasi akun pasca-reset diselesaikan oleh pemilik sendiri.',
  },
  {
    key: 'backupRestoredOrNotNeeded',
    label: 'Backup dipulihkan atau dinyatakan tidak diperlukan',
    description: 'Dari akun cloud/perangkat lain milik pemilik.',
  },
  {
    key: 'newLockSetByOwner',
    label: 'Pelanggan menetapkan PIN/pola baru langsung di perangkat',
    description: 'Aplikasi tidak pernah menetapkan atau mencatat PIN/pola.',
  },
]

/** Jalur A — Guided Factory Reset (DESIGN.md §19): panduan resmi setelah consent eksplisit per tiket. */
export function ResetPanel({ c }: { c: RecoveryCase }) {
  const update = useScreenLockStore((s) => s.update)
  const updatePostReset = useScreenLockStore((s) => s.updatePostReset)
  const [consentOpen, setConsentOpen] = useState(false)
  const blockers = resetGateBlockers(c)
  const locked = blockers.length > 0
  const items = preflight(c)
  const accepted = c.resetConsentStatus === 'accepted'
  const primary = primaryPath(c) === 'guided_factory_reset'
  const guide = accepted ? resolveResetGuide(c) : null
  const capability = resolveCapability(c)
  const accountWarning = c.accountReadiness === 'unknown' || c.accountReadiness === 'recovery_needed'

  return (
    <Panel
      aria-labelledby="path-reset-title"
      className={cn('@container p-5', primary ? 'border-danger/45' : 'border-danger/25')}
      data-locked={locked || undefined}
    >
      <div className="flex flex-wrap items-center gap-3">
        <OctagonAlert aria-hidden className="size-5 text-danger" />
        <SectionTitle id="path-reset-title">Jalur A — Guided Factory Reset</SectionTitle>
        <StatusBadge tone="danger">{RESET_CARD_LABEL}</StatusBadge>
        {primary && !locked ? <StatusBadge tone="info">Jalur utama tiket ini</StatusBadge> : null}
        {locked ? (
          <StatusBadge tone="neutral" icon={Lock}>
            Terkunci
          </StatusBadge>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-fg-muted">
        Hanya untuk pelanggan yang secara eksplisit menyetujui penghapusan data. Aplikasi menampilkan panduan resmi;
        teknisi menjalankan reset langsung pada perangkat. Tidak ada wipe, flashing, atau perintah dari komputer.
      </p>

      {locked ? (
        <div className="mt-4 rounded-ui-md border border-line-default bg-field px-4 py-3">
          <p className="text-sm font-semibold text-fg">Belum dapat dibuka:</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-relaxed text-fg-2" aria-label="Alasan reset terkunci">
            {blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <ul className="mt-4 space-y-2.5" aria-label="Preflight reset">
            {items.map((item) => {
              const { icon: Icon, className, label } = PREFLIGHT_ICON[item.status]
              return (
                <li key={item.id} className="flex items-start gap-2.5">
                  <Icon aria-hidden className={cn('mt-0.5 size-[18px] shrink-0', className)} />
                  <div className="min-w-0 text-sm leading-snug">
                    <p className="font-medium text-fg">
                      {item.label} <span className="sr-only">— {label}</span>
                    </p>
                    <p className="text-fg-muted">{item.detail}</p>
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="mt-4 grid gap-4 @[640px]:grid-cols-2">
            <AppSelect
              label="Kesiapan akun pasca-reset"
              placeholder="Tanyakan ke pelanggan…"
              value={c.accountReadiness ?? ''}
              options={optionsFrom(ACCOUNT_READINESS_LABELS)}
              hint="Tanyakan secara lisan. Jangan meminta atau mencatat email/kata sandi akun."
              onValueChange={(value) => {
                const accountReadiness = pick(ACCOUNT_READINESS_LABELS, value)
                if (accountReadiness) update({ accountReadiness })
              }}
            />
            <div className="flex flex-col gap-4">
              <AppSwitch
                label="Pelanggan memahami data lokal akan dihapus"
                description="Foto, chat, dan file yang belum dibackup tidak dapat dikembalikan oleh aplikasi."
                checked={c.dataLossExplained}
                onCheckedChange={(checked) => update({ dataLossExplained: checked })}
              />
              <AppSwitch
                label="Pelanggan memahami verifikasi akun dapat tetap diminta"
                description="Reset tidak menghapus FRP Google atau verifikasi akun Xiaomi."
                checked={c.accountVerificationExplained}
                onCheckedChange={(checked) => update({ accountVerificationExplained: checked })}
              />
            </div>
          </div>

          {accountWarning ? (
            <InlineAlert tone="warning" title={ACCOUNT_VERIFICATION_WARNING} className="mt-4">
              Pelanggan belum dapat memastikan akses ke akun yang terikat. Sarankan pemulihan akun resmi sebelum reset:{' '}
              <ExternalLink link={OFFICIAL_LINKS.googleAccountRecovery} />
              {c.brand === 'xiaomi' ? (
                <>
                  {' '}
                  · <ExternalLink link={OFFICIAL_LINKS.xiaomiAccount} />
                </>
              ) : null}
            </InlineAlert>
          ) : null}

          {c.resetConsentStatus === 'declined' ? (
            <InlineAlert tone="info" title="Pelanggan tidak setuju" className="mt-4">
              Reset tidak disetujui untuk tiket ini. Lanjutkan dengan Data Preservation atau rujuk ke layanan resmi.
            </InlineAlert>
          ) : null}

          {!accepted ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button variant="danger" disabled={!canRequestConsent(c)} onClick={() => setConsentOpen(true)}>
                Minta persetujuan reset
              </Button>
              {!canRequestConsent(c) ? (
                <span className="text-xs text-fg-muted">Lengkapi preflight yang belum siap terlebih dahulu.</span>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      {accepted && guide ? (
        <div className="mt-5 space-y-4">
          <InlineAlert tone="warning" title="Persetujuan reset dicatat untuk tiket ini">
            {c.resetConsentAt ? `Disetujui ${new Date(c.resetConsentAt).toLocaleString('id-ID')} · teks ${c.consentTextVersion}. ` : null}
            Ikuti panduan resmi langsung pada perangkat. Mengubah data tiket akan membatalkan persetujuan ini.
          </InlineAlert>
          <InlineAlert tone="info" title="Cara operasi dan verifikasi">
            {capability.note} {capability.verifyBy}
          </InlineAlert>
          {guide.warning ? (
            <InlineAlert tone="warning" title={guide.brandSpecific ? 'Model belum terverifikasi' : 'Panduan umum'}>
              {guide.warning}
            </InlineAlert>
          ) : null}
          <div>
            <p className="text-sm font-semibold text-fg">
              Panduan resmi {guide.brandSpecific ? BRAND_LABELS[c.brand] : 'Android'}
            </p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[15px] leading-relaxed text-fg-2">
              {guide.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <ul className="mt-2 space-y-1 text-sm">
              {guide.links.map((link) => (
                <li key={link.id}>
                  <ExternalLink link={link} />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-semibold text-fg">Checklist pasca-reset</p>
              <StatusBadge tone={postResetComplete(c) ? 'success' : 'neutral'}>
                {postResetComplete(c) ? 'Lengkap' : 'Belum lengkap'}
              </StatusBadge>
            </div>
            <div className="mt-3 grid gap-3 @[640px]:grid-cols-2">
              {POST_RESET_ITEMS.map((item) => (
                <AppSwitch
                  key={item.key}
                  label={item.label}
                  description={item.description}
                  checked={c.postReset[item.key]}
                  onCheckedChange={(checked) => updatePostReset({ [item.key]: checked })}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <ConsentDialog open={consentOpen} onOpenChange={setConsentOpen} c={c} />
    </Panel>
  )
}

/** Dialog consent reset: menyebut kehilangan data lokal dan potensi FRP secara eksplisit (DESIGN.md §19). */
function ConsentDialog({ open, onOpenChange, c }: { open: boolean; onOpenChange: (open: boolean) => void; c: RecoveryCase }) {
  const grantConsent = useScreenLockStore((s) => s.grantConsent)
  const declineConsent = useScreenLockStore((s) => s.declineConsent)
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-overlay fixed inset-0 z-[var(--z-dialog-overlay)] bg-black/60" />
        <Dialog.Content
          role="alertdialog"
          className="animate-popover fixed top-1/2 left-1/2 z-[var(--z-dialog)] w-[min(620px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-ui-xl border border-line-default bg-raised p-6 shadow-[var(--shadow-popover)]"
        >
          <Dialog.Title className="text-lg font-semibold text-fg">Persetujuan panduan factory reset</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-relaxed text-fg-2">
            Untuk tiket {c.ticketCode} ({BRAND_LABELS[c.brand]}
            {c.model ? ` ${c.model}` : ', model belum diketahui'}): factory reset{' '}
            <strong className="text-danger">menghapus seluruh data lokal</strong> secara permanen, termasuk foto, chat,
            dan file yang belum dibackup. Setelah reset, perangkat dapat tetap meminta akun Google/Xiaomi yang pernah
            terikat.
          </Dialog.Description>
          <div className="mt-3 rounded-ui-md border border-line-default bg-field px-3.5 py-3 text-sm leading-relaxed text-fg-2">
            Persetujuan ini hanya berlaku untuk tiket ini dan dicatat beserta waktu dan versi teks ({RESET_CONSENT_TEXT_VERSION}).
            Aplikasi tidak menjalankan reset — teknisi mengikuti panduan resmi langsung pada perangkat.
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Dialog.Close asChild>
              <Button variant="ghost">Batal</Button>
            </Dialog.Close>
            <Button
              variant="outline"
              onClick={() => {
                declineConsent()
                onOpenChange(false)
              }}
            >
              Pelanggan tidak setuju
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                grantConsent()
                onOpenChange(false)
              }}
            >
              {CONSENT_CONFIRM_LABEL}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
