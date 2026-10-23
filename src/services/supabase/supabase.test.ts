import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { createCase } from '@/features/screenLock/engine'
import { parseSupabaseConfig } from './config'
import { toCloudError } from './errors'
import { deleteRecoveryCase, saveRecoveryCase, toRow } from './recoveryCasesRepo'

function jwt(payload: object): string {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`
}

describe('parseSupabaseConfig', () => {
  const url = 'https://abcdefghijklmnop.supabase.co'

  it('accepts a publishable key or a legacy anon JWT', () => {
    expect(parseSupabaseConfig({ url, key: 'sb_publishable_abc123' })).toEqual({ kind: 'ok', url, key: 'sb_publishable_abc123' })
    expect(parseSupabaseConfig({ url, key: jwt({ role: 'anon' }) }).kind).toBe('ok')
  })

  it('rejects secret and service_role keys so they never reach the bundle', () => {
    expect(parseSupabaseConfig({ url, key: 'sb_secret_abc123' }).kind).toBe('invalid')
    expect(parseSupabaseConfig({ url, key: jwt({ role: 'service_role' }) }).kind).toBe('invalid')
  })

  it('treats empty and .env.example placeholder values as not configured', () => {
    expect(parseSupabaseConfig({})).toEqual({ kind: 'missing' })
    expect(
      parseSupabaseConfig({
        url: 'https://YOUR_PROJECT_REF.supabase.co',
        key: 'sb_publishable_REPLACE_WITH_PROJECT_PUBLISHABLE_KEY',
      }),
    ).toEqual({ kind: 'missing' })
  })

  it('rejects non-https URLs and unknown key formats', () => {
    expect(parseSupabaseConfig({ url: 'http://abcdefghijklmnop.supabase.co', key: 'sb_publishable_x' }).kind).toBe('invalid')
    expect(parseSupabaseConfig({ url: 'not a url', key: 'sb_publishable_x' }).kind).toBe('invalid')
    expect(parseSupabaseConfig({ url, key: 'random-token' }).kind).toBe('invalid')
  })
})

describe('recovery_cases repository', () => {
  const USER = 'a1111111-1111-4111-8111-111111111111'

  const screenLockCase = (brand: 'xiaomi' | 'samsung' | 'other' = 'xiaomi') => ({
    ...createCase(new Date(2026, 9, 24), brand, null),
    issueType: 'screen_pin_pattern' as const,
  })

  it('sends only columns of the migration schema — no credentials, identifiers, or free text', () => {
    const row = toRow(screenLockCase(), USER)
    expect(Object.keys(row).sort()).toEqual(
      [
        'id',
        'user_id',
        'ticket_code',
        'brand',
        'model',
        'issue_type',
        'data_priority',
        'backup_status',
        'post_reset_account_readiness',
        'access_state',
        'owner_authorization_confirmed',
        'chosen_path',
        'reset_consent_status',
        'reset_consent_at',
        'consent_text_version',
        'status',
        'outcome_summary',
      ].sort(),
    )
    expect(Object.keys(row).join(' ')).not.toMatch(/pin|pattern|password|otp|token|imei|serial|email/i)
    expect(JSON.stringify(row)).not.toContain('@')
  })

  it('records an unanswered data preference as undecided, never as erase approved', () => {
    const row = toRow(screenLockCase(), USER)
    expect(row).toMatchObject({
      data_priority: 'unknown',
      post_reset_account_readiness: 'unknown',
      chosen_path: 'unresolved',
      reset_consent_status: 'not_requested',
      status: 'in_progress',
    })
  })

  it('refuses to save a case without an issue type (NOT NULL column)', async () => {
    const client = { from: vi.fn() } as unknown as SupabaseClient
    const result = await saveRecoveryCase(client, createCase(new Date(), 'other', null), USER)
    expect(result).toMatchObject({ ok: false, error: { kind: 'invalid' } })
    expect(client.from).not.toHaveBeenCalled()
  })

  it('upserts by id and reports the server timestamp only after confirmation', async () => {
    const single = vi.fn().mockResolvedValue({ data: { updated_at: '2026-10-24T03:00:00Z' }, error: null })
    const upsert = vi.fn(() => ({ select: () => ({ single }) }))
    const client = { from: vi.fn(() => ({ upsert })) } as unknown as SupabaseClient
    const c = screenLockCase('samsung')

    const result = await saveRecoveryCase(client, c, USER)
    expect(result).toEqual({ ok: true, value: { updatedAt: '2026-10-24T03:00:00Z' } })
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ id: c.id, user_id: USER }), { onConflict: 'id' })
  })

  it('maps RLS and constraint errors without leaking raw server messages', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { code: '42501', message: 'new row violates row-level security policy for table "recovery_cases"' } })
    const client = { from: () => ({ upsert: () => ({ select: () => ({ single }) }) }) } as unknown as SupabaseClient
    const result = await saveRecoveryCase(client, screenLockCase('other'), USER)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('permission')
      expect(result.error.message).not.toContain('recovery_cases')
    }
    expect(toCloudError({ code: '23514' }).kind).toBe('invalid')
    expect(toCloudError({ code: 'PGRST301' }).kind).toBe('session_expired')
    expect(toCloudError(new TypeError('Failed to fetch')).kind).toBe('offline')
    expect(toCloudError({ status: 429 }).kind).toBe('rate_limited')
  })

  it('treats a delete that matched no rows as denied, not as success', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null, count: 0 })
    const client = { from: () => ({ delete: () => ({ eq }) }) } as unknown as SupabaseClient
    const result = await deleteRecoveryCase(client, 'c3333333-3333-4333-8333-333333333333')
    expect(result).toMatchObject({ ok: false, error: { kind: 'permission' } })
  })
})
