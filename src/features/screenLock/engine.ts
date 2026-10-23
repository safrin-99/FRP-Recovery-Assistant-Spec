import { BRAND_LABELS } from '@/data/catalog'
import type { BrandId, DeviceSnapshot } from '@/types/domain'
import { deviceEvidenceFrom } from './capabilities'
import {
  ACCESS_STATE_LABELS,
  ACCOUNT_READINESS_LABELS,
  BACKUP_STATUS_LABELS,
  CHOSEN_PATH_LABELS,
  CONSENT_LABELS,
  DATA_PREFERENCE_LABELS,
  ISSUE_TYPE_LABELS,
  OUTCOME_LABELS,
  PRESERVATION_RESULT_LABELS,
  RESET_CONSENT_TEXT_VERSION,
  type CaseStatus,
  type ChosenPath,
  type IssueType,
  type Outcome,
  type RecoveryCase,
} from './model'

/**
 * Mesin keputusan Screen Lock Recovery (PRD v2.4 §7.2/§8, DESIGN.md §19). Fungsi murni.
 * Jalur mengikuti preferensi data pelanggan per tiket: Guided Factory Reset (Jalur A) hanya
 * setelah "Setuju hapus data" + preflight + consent eksplisit; selain itu Data Preservation
 * (Jalur B). Tidak ada aksi perangkat — Jalur A hanya membuka panduan resmi.
 */

const CASE_SUFFIX_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomSuffix(length = 4): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => CASE_SUFFIX_CHARS[b % CASE_SUFFIX_CHARS.length]).join('')
}

/** Nomor tiket dibuat aplikasi: SLR-YYYYMMDD-XXXX (tanpa data pribadi pelanggan). */
export function newTicketCode(now: Date): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `SLR-${y}${m}${d}-${randomSuffix()}`
}

/**
 * Kasus baru. Model hanya dari perangkat live (bukan demo). Preferensi data, tipe masalah,
 * dan kesiapan akun sengaja kosong: consent tidak pernah diwariskan dari tiket lain.
 */
export function createCase(now: Date, brand: BrandId, device: DeviceSnapshot | null): RecoveryCase {
  const evidence = deviceEvidenceFrom(device)
  const detected = device?.source === 'live' ? (device.model ?? device.modelCode) : null
  return {
    id: crypto.randomUUID(),
    ticketCode: newTicketCode(now),
    brand,
    model: detected,
    modelSource: detected ? 'detected' : 'unknown',
    issueType: null,
    accessState: 'unknown',
    dataPreference: null,
    backupStatus: 'not_checked',
    accountReadiness: null,
    ownerAuthorizationConfirmed: false,
    ownerAuthorizedAt: null,
    deviceEvidence: evidence,
    preservation: { officialAccessChecked: false, deviceDetectionRun: false },
    preservationResult: 'unknown',
    dataLossExplained: false,
    accountVerificationExplained: false,
    resetConsentStatus: 'not_requested',
    resetConsentAt: null,
    consentTextVersion: null,
    postReset: { setupCompleted: false, accountActivated: false, backupRestoredOrNotNeeded: false, newLockSetByOwner: false },
    outcome: 'not_verified',
    createdAt: now.toISOString(),
  }
}

/** true bila pelanggan secara eksplisit memilih "Setuju hapus data" untuk tiket ini. */
export function erasureApproved(c: RecoveryCase): boolean {
  return c.dataPreference === 'not_important'
}

/** Jalur yang ditampilkan sebagai jalur utama: reset hanya bila pelanggan setuju hapus data. */
export function primaryPath(c: RecoveryCase): 'guided_factory_reset' | 'data_preservation' {
  return erasureApproved(c) ? 'guided_factory_reset' : 'data_preservation'
}

export interface ChecklistItem {
  id: string
  label: string
  done: boolean
}

/** Checklist Jalur B (Data Preservation), read-only. */
export function preservationChecklist(c: RecoveryCase): ChecklistItem[] {
  return [
    {
      id: 'classified',
      label: 'Klasifikasikan masalah: kunci layar vs App Lock/Privacy Lock vs akun/FRP',
      done: c.issueType !== null,
    },
    {
      id: 'official-access',
      label: 'Periksa metode akses resmi yang masih bekerja (biometrik, kredensial alternatif resmi)',
      done: c.preservation.officialAccessChecked && c.accessState !== 'unknown',
    },
    {
      id: 'backup',
      label: 'Periksa backup/sinkronisasi dari perangkat lain atau akun cloud',
      done: c.backupStatus !== 'not_checked',
    },
    {
      id: 'detection',
      label: 'Jalankan deteksi perangkat tanpa mengklaim akses data',
      done: c.preservation.deviceDetectionRun,
    },
  ]
}

export function preservationReviewed(c: RecoveryCase): boolean {
  return preservationChecklist(c).every((item) => item.done) && c.preservationResult !== 'unknown'
}

const ACCOUNT_ISSUES: ReadonlyArray<IssueType> = ['google_account', 'frp_after_reset', 'xiaomi_account']

/** Masalah yang bukan kunci layar diarahkan ke jalur lain dan tidak pernah membuka reset. */
export function redirectFor(c: RecoveryCase): { target: 'frp-recovery' | 'tools' | null; message: string } | null {
  switch (c.issueType) {
    case 'app_lock':
    case 'privacy_lock':
      return {
        target: null,
        message:
          'App Lock/Privacy Lock bukan kunci layar. Pulihkan lewat akun/aplikasi terkait; factory reset tidak diperlukan dan tidak ditawarkan.',
      }
    case 'google_account':
    case 'frp_after_reset':
    case 'xiaomi_account':
      return {
        target: 'frp-recovery',
        message: 'Masalah akun/verifikasi aktivasi ditangani lewat pemulihan akun resmi di halaman FRP Recovery, bukan reset.',
      }
    case 'boot_or_system':
      return { target: 'tools', message: 'Kerusakan sistem diperiksa lewat deteksi Fastboot dan panduan resmi produsen.' }
    default:
      return null
  }
}

/** Alasan Jalur A (Guided Factory Reset) belum dapat dibuka. Kosong = boleh menjalankan preflight. */
export function resetGateBlockers(c: RecoveryCase): string[] {
  const blockers: string[] = []
  if (c.dataPreference === null) blockers.push('Preferensi data pelanggan untuk tiket ini belum dipilih.')
  else if (c.dataPreference === 'preserve')
    blockers.push('Pelanggan memilih data harus dipertahankan. Reset hanya aktif bila pelanggan mengubah keputusan dan memberikan persetujuan baru.')
  else if (c.dataPreference === 'unknown')
    blockers.push('Pelanggan belum memutuskan. Gunakan Data Preservation sampai ada persetujuan hapus data yang eksplisit.')
  if (c.issueType !== 'screen_pin_pattern') blockers.push('Jalur reset hanya untuk keluhan lupa PIN/pola/sandi layar.')
  if (!c.ownerAuthorizationConfirmed) blockers.push('Konfirmasi izin pemilik belum dicatat.')
  return blockers
}

export interface PreflightItem {
  id: 'identity' | 'model' | 'backup' | 'account' | 'data-loss' | 'account-verification'
  label: string
  status: 'ok' | 'warning' | 'blocked'
  detail: string
}

export const ACCOUNT_VERIFICATION_WARNING = 'Perangkat mungkin meminta verifikasi akun setelah reset'

/** Preflight Jalur A sebelum consent (PRD v2.4 §7.2, DESIGN.md §19). */
export function preflight(c: RecoveryCase): PreflightItem[] {
  const modelKnown = c.modelSource !== 'unknown' && Boolean(c.model)
  const backupReviewed = ['available_verified', 'partial', 'none'].includes(c.backupStatus)
  const accountReady = c.accountReadiness !== null && ['google_ready', 'xiaomi_ready', 'both_ready', 'not_applicable'].includes(c.accountReadiness)
  const ev = c.deviceEvidence
  return [
    {
      // Warning (bukan blocked): layar terkunci total sering tidak dapat dideteksi sama sekali;
      // namun identitas tidak boleh diklaim terverifikasi tanpa bukti deteksi nyata.
      id: 'identity',
      label: 'Identitas perangkat dari deteksi nyata',
      status: ev ? 'ok' : 'warning',
      detail: ev
        ? `Terdeteksi (${ev.sessionId}, ${ev.transport}${ev.mode ? `, ${ev.mode}` : ''}). Jalankan ulang deteksi bila perangkat berganti.`
        : 'Belum ada bukti deteksi nyata untuk tiket ini. Identitas memakai input teknisi; jangan mengklaim perangkat terverifikasi.',
    },
    {
      id: 'model',
      label: 'Merek/model perangkat',
      status: modelKnown ? 'ok' : 'warning',
      detail: modelKnown
        ? `${BRAND_LABELS[c.brand]} ${c.model} (${c.modelSource === 'detected' ? 'terdeteksi' : 'dari teknisi'})`
        : 'Model belum diketahui — hanya panduan umum resmi yang ditampilkan, bukan langkah spesifik yang ditebak.',
    },
    {
      id: 'backup',
      label: 'Backup',
      status: backupReviewed ? 'ok' : 'warning',
      detail: backupReviewed
        ? BACKUP_STATUS_LABELS[c.backupStatus]
        : `${BACKUP_STATUS_LABELS[c.backupStatus]} — pelanggan menyatakan data boleh hilang; tawarkan pemeriksaan backup sebelum reset.`,
    },
    {
      id: 'account',
      label: 'Kesiapan akun Google/Xiaomi pasca-reset',
      status: c.accountReadiness === null ? 'blocked' : accountReady ? 'ok' : 'warning',
      detail:
        c.accountReadiness === null
          ? 'Tanyakan apakah pelanggan dapat masuk ke akun yang terikat setelah reset (tanpa meminta email atau kata sandi).'
          : accountReady
            ? ACCOUNT_READINESS_LABELS[c.accountReadiness]
            : `${ACCOUNT_VERIFICATION_WARNING}. Sarankan pemulihan akun resmi sebelum melanjutkan.`,
    },
    {
      id: 'data-loss',
      label: 'Kehilangan data lokal dijelaskan',
      status: c.dataLossExplained ? 'ok' : 'blocked',
      detail: c.dataLossExplained
        ? 'Pelanggan memahami data lokal akan dihapus permanen.'
        : 'Jelaskan bahwa foto, chat, dan file lokal yang belum dibackup akan terhapus permanen.',
    },
    {
      id: 'account-verification',
      label: 'Potensi FRP/aktivasi dijelaskan',
      status: c.accountVerificationExplained ? 'ok' : 'blocked',
      detail: c.accountVerificationExplained
        ? 'Pelanggan memahami verifikasi akun Google/Xiaomi mungkin tetap diminta.'
        : 'Jelaskan bahwa reset tidak menghapus FRP atau verifikasi akun Xiaomi.',
    },
  ]
}

export function canRequestConsent(c: RecoveryCase): boolean {
  return resetGateBlockers(c).length === 0 && preflight(c).every((item) => item.status !== 'blocked')
}

/** Persetujuan reset eksplisit untuk tiket ini. Melempar error bila prasyarat belum terpenuhi. */
export function grantResetConsent(c: RecoveryCase, now: Date): RecoveryCase {
  if (!canRequestConsent(c)) throw new Error('Prasyarat consent reset belum terpenuhi.')
  return { ...c, resetConsentStatus: 'accepted', resetConsentAt: now.toISOString(), consentTextVersion: RESET_CONSENT_TEXT_VERSION }
}

/** Penolakan tidak pernah menghasilkan status "disetujui". */
export function declineResetConsent(c: RecoveryCase, now: Date): RecoveryCase {
  return { ...c, resetConsentStatus: 'declined', resetConsentAt: now.toISOString(), consentTextVersion: RESET_CONSENT_TEXT_VERSION }
}

/** Membatalkan consent yang tercatat (prasyarat berubah). */
export function revokeResetConsent(c: RecoveryCase): RecoveryCase {
  return { ...c, resetConsentStatus: 'not_requested', resetConsentAt: null, consentTextVersion: null }
}

/** `chosen_path`: guided_factory_reset hanya setelah consent diterima (sama dengan CHECK di database). */
export function chosenPath(c: RecoveryCase): ChosenPath {
  if (c.resetConsentStatus === 'accepted') return 'guided_factory_reset'
  if (c.outcome === 'referred_official_service' || c.preservationResult === 'needs_official_service') return 'official_service'
  if (c.issueType !== null && ACCOUNT_ISSUES.includes(c.issueType)) return 'account_recovery'
  if (c.dataPreference === 'preserve' || c.dataPreference === 'unknown' || c.resetConsentStatus === 'declined') return 'data_preservation'
  return 'unresolved'
}

export function caseStatus(c: RecoveryCase): CaseStatus {
  switch (c.outcome) {
    case 'verified_success':
    case 'referred_official_service':
      return 'completed'
    case 'awaiting_account_recovery':
      return 'awaiting_owner'
    case 'failed':
      return 'blocked'
    default:
      return c.resetConsentStatus === 'accepted' || c.issueType !== null || c.dataPreference !== null ? 'in_progress' : 'open'
  }
}

export function postResetComplete(c: RecoveryCase): boolean {
  const p = c.postReset
  return p.setupCompleted && p.accountActivated && p.backupRestoredOrNotNeeded && p.newLockSetByOwner
}

/** "Berhasil diverifikasi" hanya dengan bukti: checklist pasca-reset lengkap atau opsi resmi berhasil di Jalur B. */
export function allowedOutcomes(c: RecoveryCase): Outcome[] {
  const verifiable =
    (c.resetConsentStatus === 'accepted' && postResetComplete(c)) || c.preservationResult === 'official_option_found'
  return [
    ...(verifiable ? (['verified_success'] as const) : []),
    'awaiting_account_recovery',
    'referred_official_service',
    'failed',
    'not_verified',
  ]
}

export function setOutcome(c: RecoveryCase, outcome: Outcome): RecoveryCase {
  if (!allowedOutcomes(c).includes(outcome)) throw new Error('Outcome belum dapat diverifikasi.')
  return { ...c, outcome }
}

/** Ringkasan tersanitasi untuk `recovery_cases.outcome_summary` (hanya field terstruktur). */
export function caseSummary(c: RecoveryCase): string {
  const post = Object.values(c.postReset).filter(Boolean).length
  const consent =
    c.resetConsentStatus === 'not_requested'
      ? CONSENT_LABELS.not_requested
      : `${CONSENT_LABELS[c.resetConsentStatus]}${c.resetConsentAt ? ` (${c.resetConsentAt})` : ''}`
  const lines = [
    `${c.ticketCode} · ${BRAND_LABELS[c.brand]}${c.model ? ` ${c.model}` : ''}`,
    `Masalah: ${c.issueType ? ISSUE_TYPE_LABELS[c.issueType] : 'Belum dipilih'}`,
    `Preferensi data: ${c.dataPreference ? DATA_PREFERENCE_LABELS[c.dataPreference] : 'Belum ditanyakan'}`,
    `Backup: ${BACKUP_STATUS_LABELS[c.backupStatus]} · Akses: ${ACCESS_STATE_LABELS[c.accessState]}`,
    `Identitas perangkat: ${
      c.deviceEvidence
        ? `terdeteksi (${c.deviceEvidence.sessionId}, ${c.deviceEvidence.transport}${c.deviceEvidence.mode ? `, ${c.deviceEvidence.mode}` : ''})`
        : 'belum terverifikasi dari deteksi'
    }`,
    `Kesiapan akun: ${c.accountReadiness ? ACCOUNT_READINESS_LABELS[c.accountReadiness] : 'Belum ditanyakan'}`,
    `Jalur: ${CHOSEN_PATH_LABELS[chosenPath(c)]} · Data Preservation: ${PRESERVATION_RESULT_LABELS[c.preservationResult]}`,
    `Consent reset: ${consent}`,
    ...(c.resetConsentStatus === 'accepted' ? [`Checklist pasca-reset: ${post}/4`] : []),
    `Hasil: ${OUTCOME_LABELS[c.outcome]}`,
  ]
  return lines.join('\n').slice(0, 4000)
}
