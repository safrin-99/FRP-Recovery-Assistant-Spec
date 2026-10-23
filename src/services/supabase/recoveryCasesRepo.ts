import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { caseStatus, caseSummary, chosenPath } from '@/features/screenLock/engine'
import {
  CaseStatusSchema,
  ChosenPathSchema,
  ResetConsentStatusSchema,
  type IssueType,
  type RecoveryCase,
} from '@/features/screenLock/model'
import { cloudError, toCloudError, type CloudResult } from './errors'

/**
 * Repository `recovery_cases` (PRD v2.4 §11, skema di `supabase/migrations/`). Hanya field
 * allowlist yang dikirim; tidak ada PIN/pola/sandi/OTP/token, email akun, IMEI/serial, atau
 * teks bebas. RLS di database tetap menjadi penegak kepemilikan baris.
 */

export interface RecoveryCaseRow {
  id: string
  user_id: string
  ticket_code: string
  brand: string
  model: string | null
  issue_type: IssueType
  data_priority: string
  backup_status: string
  post_reset_account_readiness: string
  access_state: string
  owner_authorization_confirmed: boolean
  chosen_path: string
  reset_consent_status: string
  reset_consent_at: string | null
  consent_text_version: string | null
  status: string
  outcome_summary: string
}

/** Petakan kasus ke baris tabel. `issueType` wajib sudah dipilih (kolom NOT NULL tanpa default). */
export function toRow(c: RecoveryCase & { issueType: IssueType }, userId: string): RecoveryCaseRow {
  return {
    id: c.id,
    user_id: userId,
    ticket_code: c.ticketCode,
    brand: c.brand,
    model: c.model,
    issue_type: c.issueType,
    // Belum ditanyakan dicatat sebagai "belum memutuskan" — tidak pernah sebagai persetujuan hapus data.
    data_priority: c.dataPreference ?? 'unknown',
    backup_status: c.backupStatus,
    post_reset_account_readiness: c.accountReadiness ?? 'unknown',
    access_state: c.accessState,
    owner_authorization_confirmed: c.ownerAuthorizationConfirmed,
    chosen_path: chosenPath(c),
    reset_consent_status: c.resetConsentStatus,
    reset_consent_at: c.resetConsentAt,
    consent_text_version: c.consentTextVersion,
    status: caseStatus(c),
    outcome_summary: caseSummary(c),
  }
}

const LIST_COLUMNS = 'id, ticket_code, brand, model, chosen_path, reset_consent_status, status, updated_at'

export const CloudCaseSchema = z.object({
  id: z.uuid(),
  ticket_code: z.string().max(80).nullable(),
  brand: z.string().max(60),
  model: z.string().max(120).nullable(),
  chosen_path: ChosenPathSchema,
  reset_consent_status: ResetConsentStatusSchema,
  status: CaseStatusSchema,
  updated_at: z.string(),
})
export type CloudCase = z.infer<typeof CloudCaseSchema>

export async function saveRecoveryCase(
  client: SupabaseClient,
  c: RecoveryCase,
  userId: string,
): Promise<CloudResult<{ updatedAt: string }>> {
  if (c.issueType === null) return { ok: false, error: cloudError('invalid') }
  try {
    const { data, error } = await client
      .from('recovery_cases')
      .upsert(toRow({ ...c, issueType: c.issueType }, userId), { onConflict: 'id' })
      .select('updated_at')
      .single()
    if (error) return { ok: false, error: toCloudError(error) }
    const updatedAt = (data as { updated_at?: unknown } | null)?.updated_at
    if (typeof updatedAt !== 'string') return { ok: false, error: cloudError('unknown') }
    return { ok: true, value: { updatedAt } }
  } catch (err) {
    return { ok: false, error: toCloudError(err) }
  }
}

export async function listRecoveryCases(client: SupabaseClient, limit = 50): Promise<CloudResult<CloudCase[]>> {
  try {
    const { data, error } = await client
      .from('recovery_cases')
      .select(LIST_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) return { ok: false, error: toCloudError(error) }
    const parsed = z.array(CloudCaseSchema).safeParse(data)
    return parsed.success ? { ok: true, value: parsed.data } : { ok: false, error: cloudError('unknown') }
  } catch (err) {
    return { ok: false, error: toCloudError(err) }
  }
}

/** Hapus kasus milik pengguna; `count` memastikan baris benar-benar terhapus (RLS dapat menyaring 0 baris). */
export async function deleteRecoveryCase(client: SupabaseClient, id: string): Promise<CloudResult<void>> {
  try {
    const { error, count } = await client.from('recovery_cases').delete({ count: 'exact' }).eq('id', id)
    if (error) return { ok: false, error: toCloudError(error) }
    if (count === 0) return { ok: false, error: cloudError('permission') }
    return { ok: true, value: undefined }
  } catch (err) {
    return { ok: false, error: toCloudError(err) }
  }
}
