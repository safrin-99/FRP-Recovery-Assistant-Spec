import { z } from 'zod'
import type { Authorization, BrandId, DeviceMode, Transport } from '@/types/domain'

/**
 * Model kasus Screen Lock Recovery (PRD v2.4 §7.2, DESIGN.md §19). Nilai enum yang disimpan
 * sama dengan CHECK constraint `recovery_cases` di `supabase/migrations/…_initial_schema.sql`.
 * Tidak ada field untuk PIN/pola/kata sandi/OTP/token, email akun, IMEI, atau serial.
 */

export const IssueTypeSchema = z.enum([
  'screen_pin_pattern',
  'app_lock',
  'privacy_lock',
  'google_account',
  'frp_after_reset',
  'xiaomi_account',
  'boot_or_system',
  'other',
])
/** Preferensi data pelanggan per tiket (kolom `data_priority`). */
export const DataPreferenceSchema = z.enum(['not_important', 'preserve', 'unknown'])
export const BackupStatusSchema = z.enum(['not_checked', 'available_verified', 'partial', 'none', 'unknown'])
export const AccountReadinessSchema = z.enum([
  'google_ready',
  'xiaomi_ready',
  'both_ready',
  'recovery_needed',
  'not_applicable',
  'unknown',
])
export const AccessStateSchema = z.enum([
  'home_access',
  'biometric_maybe_available',
  'locked_screen',
  'recovery',
  'fastboot',
  'boot_setup',
  'unknown',
])
export const ChosenPathSchema = z.enum([
  'data_preservation',
  'account_recovery',
  'guided_factory_reset',
  'official_service',
  'unresolved',
])
export const ResetConsentStatusSchema = z.enum(['not_requested', 'pending', 'accepted', 'declined'])
export const CaseStatusSchema = z.enum(['open', 'in_progress', 'awaiting_owner', 'completed', 'blocked', 'cancelled'])

/** Hasil pemeriksaan Jalur B (Data Preservation) — dicatat di ringkasan, bukan kolom terpisah. */
export const PreservationResultSchema = z.enum([
  'official_option_found',
  'backup_verified',
  'no_non_destructive_option',
  'needs_official_service',
  'unknown',
])
/** Hasil kasus (DESIGN.md §19) — dipetakan ke `status` dan dicatat di `outcome_summary`. */
export const OutcomeSchema = z.enum([
  'verified_success',
  'awaiting_account_recovery',
  'referred_official_service',
  'failed',
  'not_verified',
])
export const ModelSourceSchema = z.enum(['detected', 'reported', 'unknown'])

export type IssueType = z.infer<typeof IssueTypeSchema>
export type DataPreference = z.infer<typeof DataPreferenceSchema>
export type BackupStatus = z.infer<typeof BackupStatusSchema>
export type AccountReadiness = z.infer<typeof AccountReadinessSchema>
export type AccessState = z.infer<typeof AccessStateSchema>
export type ChosenPath = z.infer<typeof ChosenPathSchema>
export type ResetConsentStatus = z.infer<typeof ResetConsentStatusSchema>
export type CaseStatus = z.infer<typeof CaseStatusSchema>
export type PreservationResult = z.infer<typeof PreservationResultSchema>
export type Outcome = z.infer<typeof OutcomeSchema>
export type ModelSource = z.infer<typeof ModelSourceSchema>

/** Versi teks persetujuan reset yang ditampilkan di dialog consent (`consent_text_version`, ≤ 40 karakter). */
export const RESET_CONSENT_TEXT_VERSION = 'slr-reset-consent-2026-10-24'

/** Checklist Jalur B (read-only, tanpa write operation ke perangkat). */
export interface PreservationChecklist {
  /** Akses resmi yang masih bekerja sudah diperiksa (biometrik, kredensial alternatif resmi, dll.). */
  officialAccessChecked: boolean
  /** Deteksi perangkat sudah dijalankan tanpa mengklaim akses data. */
  deviceDetectionRun: boolean
}

/**
 * Bukti perangkat dari deteksi nyata (bukan demo). Dicatat pada tiket agar identitas perangkat
 * untuk jalur reset berasal dari hasil deteksi, bukan data mock (TASK-02 §3.1-3.2). Tidak memuat
 * serial/IMEI: hanya ID sesi internal (`device-N`) dan status koneksi.
 */
export interface DeviceEvidence {
  sessionId: string
  transport: Transport
  authorization: Authorization
  mode: DeviceMode | null
  modelCode: string | null
  detectedAt: string
}

/** Checklist pasca-reset (DESIGN.md §19). */
export interface PostResetChecklist {
  setupCompleted: boolean
  accountActivated: boolean
  backupRestoredOrNotNeeded: boolean
  newLockSetByOwner: boolean
}

export interface RecoveryCase {
  /** UUID; sama dengan `recovery_cases.id` bila disimpan ke cloud. */
  id: string
  /** Nomor tiket dibuat aplikasi (`ticket_code`). */
  ticketCode: string
  brand: BrandId
  model: string | null
  modelSource: ModelSource
  /** `null` = belum dipilih; wajib dipilih sebelum disimpan. */
  issueType: IssueType | null
  accessState: AccessState
  /** `null` = belum ditanyakan. Tidak ada default consent (DESIGN.md §19). */
  dataPreference: DataPreference | null
  backupStatus: BackupStatus
  /** `null` = belum ditanyakan ke pelanggan. */
  accountReadiness: AccountReadiness | null
  ownerAuthorizationConfirmed: boolean
  ownerAuthorizedAt: string | null
  /** Bukti dari deteksi nyata; `null` bila perangkat belum terdeteksi (mis. layar terkunci total). */
  deviceEvidence: DeviceEvidence | null
  preservation: PreservationChecklist
  preservationResult: PreservationResult
  /** Pelanggan memahami data lokal akan dihapus. */
  dataLossExplained: boolean
  /** Pelanggan memahami verifikasi akun Google/Xiaomi (FRP) mungkin tetap diminta setelah reset. */
  accountVerificationExplained: boolean
  resetConsentStatus: ResetConsentStatus
  resetConsentAt: string | null
  consentTextVersion: string | null
  postReset: PostResetChecklist
  outcome: Outcome
  createdAt: string
}

/** Model perangkat dari input teknisi: teks biasa yang tervalidasi, bukan identifier. */
export const ReportedModelSchema = z
  .string()
  .trim()
  .min(1, 'Model tidak boleh kosong')
  .max(64, 'Maksimal 64 karakter')
  .regex(/^[\p{L}\p{N} ._\-+/()]*$/u, 'Hanya huruf, angka, spasi, dan . _ - + / ( )')

// --- Label UI (Bahasa Indonesia) -------------------------------------------

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  screen_pin_pattern: 'Lupa PIN/pola/sandi layar',
  app_lock: 'App Lock (bukan kunci layar)',
  privacy_lock: 'Privacy Lock (bukan kunci layar)',
  google_account: 'Lupa akun Google',
  frp_after_reset: 'Verifikasi akun Google (FRP) setelah reset',
  xiaomi_account: 'Verifikasi akun Xiaomi',
  boot_or_system: 'Kerusakan sistem / tidak bisa boot',
  other: 'Lainnya',
}

export const DATA_PREFERENCE_LABELS: Record<DataPreference, string> = {
  not_important: 'Setuju hapus data',
  preserve: 'Data harus dipertahankan',
  unknown: 'Belum memutuskan',
}

export const BACKUP_STATUS_LABELS: Record<BackupStatus, string> = {
  not_checked: 'Belum diperiksa',
  available_verified: 'Tersedia dan terverifikasi',
  partial: 'Sebagian',
  none: 'Tidak ada',
  unknown: 'Tidak diketahui',
}

export const ACCOUNT_READINESS_LABELS: Record<AccountReadiness, string> = {
  google_ready: 'Siap — akun Google',
  xiaomi_ready: 'Siap — akun Xiaomi',
  both_ready: 'Siap — akun Google dan Xiaomi',
  recovery_needed: 'Perlu pemulihan akun',
  not_applicable: 'Tidak ada akun terikat',
  unknown: 'Tidak diketahui',
}

export const ACCESS_STATE_LABELS: Record<AccessState, string> = {
  locked_screen: 'Layar terkunci',
  biometric_maybe_available: 'Biometrik mungkin masih berfungsi',
  home_access: 'Masih dapat masuk layar utama',
  recovery: 'Mode recovery',
  fastboot: 'Mode fastboot',
  boot_setup: 'Layar setup/aktivasi',
  unknown: 'Belum diketahui',
}

export const PRESERVATION_RESULT_LABELS: Record<PreservationResult, string> = {
  official_option_found: 'Opsi resmi ditemukan',
  backup_verified: 'Backup terverifikasi',
  no_non_destructive_option: 'Tidak ada opsi non-destruktif terverifikasi',
  needs_official_service: 'Perlu layanan resmi',
  unknown: 'Belum diketahui',
}

export const OUTCOME_LABELS: Record<Outcome, string> = {
  verified_success: 'Berhasil diverifikasi',
  awaiting_account_recovery: 'Menunggu pemulihan akun',
  referred_official_service: 'Dirujuk ke layanan resmi',
  failed: 'Gagal',
  not_verified: 'Belum diverifikasi',
}

export const CHOSEN_PATH_LABELS: Record<ChosenPath, string> = {
  guided_factory_reset: 'Guided Factory Reset',
  data_preservation: 'Data Preservation',
  account_recovery: 'Pemulihan akun resmi',
  official_service: 'Layanan resmi',
  unresolved: 'Belum ditentukan',
}

export const CONSENT_LABELS: Record<ResetConsentStatus, string> = {
  not_requested: 'Belum diminta',
  pending: 'Menunggu pelanggan',
  accepted: 'Disetujui pelanggan',
  declined: 'Ditolak pelanggan',
}

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  open: 'Terbuka',
  in_progress: 'Diproses',
  awaiting_owner: 'Menunggu pemilik',
  completed: 'Selesai',
  blocked: 'Terhambat',
  cancelled: 'Dibatalkan',
}
