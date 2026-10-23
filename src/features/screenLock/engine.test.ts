import { describe, expect, it } from 'vitest'
import type { DeviceSnapshot } from '@/types/domain'
import {
  allowedOutcomes,
  canRequestConsent,
  caseStatus,
  caseSummary,
  chosenPath,
  createCase,
  declineResetConsent,
  grantResetConsent,
  newTicketCode,
  preflight,
  preservationReviewed,
  primaryPath,
  redirectFor,
  resetGateBlockers,
  setOutcome,
} from './engine'
import { resolveResetGuide } from './guide'
import { RESET_CONSENT_TEXT_VERSION, type RecoveryCase } from './model'

const NOW = new Date(2026, 9, 24, 10, 0, 0)

/** Tiket dengan pelanggan yang eksplisit setuju hapus data dan preflight lengkap. */
function erasureCase(overrides: Partial<RecoveryCase> = {}): RecoveryCase {
  return {
    ...createCase(NOW, 'xiaomi', null),
    issueType: 'screen_pin_pattern',
    accessState: 'locked_screen',
    dataPreference: 'not_important',
    backupStatus: 'partial',
    accountReadiness: 'xiaomi_ready',
    ownerAuthorizationConfirmed: true,
    ownerAuthorizedAt: NOW.toISOString(),
    model: 'Redmi Note 13',
    modelSource: 'reported',
    dataLossExplained: true,
    accountVerificationExplained: true,
    ...overrides,
  }
}

describe('Screen Lock Recovery engine (per-ticket customer choice)', () => {
  it('creates ticket codes within the database limit', () => {
    expect(newTicketCode(NOW)).toMatch(/^SLR-20261024-[A-Z0-9]{4}$/)
  })

  it('starts every ticket without a data preference, consent, or account answer', () => {
    const c = createCase(NOW, 'samsung', null)
    expect(c.dataPreference).toBeNull()
    expect(c.issueType).toBeNull()
    expect(c.accountReadiness).toBeNull()
    expect(c.resetConsentStatus).toBe('not_requested')
    expect(primaryPath(c)).toBe('data_preservation')
    expect(resetGateBlockers(c)).toContain('Preferensi data pelanggan untuk tiket ini belum dipilih.')
  })

  it('takes the model only from a live device, never from demo data', () => {
    const live = { source: 'live', model: 'Redmi Note 13', modelCode: '2312DRA50G' } as DeviceSnapshot
    const demo = { source: 'demo', model: 'Galaxy A54', modelCode: 'SM-A546E' } as DeviceSnapshot
    expect(createCase(NOW, 'xiaomi', live)).toMatchObject({ model: 'Redmi Note 13', modelSource: 'detected' })
    expect(createCase(NOW, 'samsung', demo)).toMatchObject({ model: null, modelSource: 'unknown' })
  })

  it('makes Guided Factory Reset the primary path only after "Setuju hapus data"', () => {
    expect(primaryPath(erasureCase())).toBe('guided_factory_reset')
    expect(resetGateBlockers(erasureCase())).toEqual([])
    expect(canRequestConsent(erasureCase())).toBe(true)
  })

  it('keeps reset inactive when the customer wants to preserve data or has not decided', () => {
    for (const dataPreference of ['preserve', 'unknown'] as const) {
      const c = erasureCase({ dataPreference })
      expect(primaryPath(c)).toBe('data_preservation')
      expect(resetGateBlockers(c)).toHaveLength(1)
      expect(canRequestConsent(c)).toBe(false)
      expect(() => grantResetConsent(c, NOW)).toThrow()
    }
  })

  it('requires owner authorization separately from the reset consent', () => {
    const c = erasureCase({ ownerAuthorizationConfirmed: false, ownerAuthorizedAt: null })
    expect(resetGateBlockers(c)).toEqual(['Konfirmasi izin pemilik belum dicatat.'])
  })

  it('blocks consent until data loss and possible FRP have been explained and the account question asked', () => {
    expect(canRequestConsent(erasureCase({ dataLossExplained: false }))).toBe(false)
    expect(canRequestConsent(erasureCase({ accountVerificationExplained: false }))).toBe(false)
    expect(canRequestConsent(erasureCase({ accountReadiness: null }))).toBe(false)
  })

  it('warns — not guesses — when the account or model is unknown', () => {
    const c = erasureCase({ accountReadiness: 'unknown', model: null, modelSource: 'unknown' })
    const items = preflight(c)
    expect(items.find((i) => i.id === 'account')).toMatchObject({ status: 'warning' })
    expect(items.find((i) => i.id === 'account')?.detail).toContain('Perangkat mungkin meminta verifikasi akun setelah reset')
    expect(items.find((i) => i.id === 'model')).toMatchObject({ status: 'warning' })
    expect(canRequestConsent(c)).toBe(true)

    const guide = resolveResetGuide(grantResetConsent(c, NOW))
    expect(guide.warning).toMatch(/Model belum terverifikasi/)
    expect(guide.steps.join(' ')).not.toMatch(/volume|power \+|tekan tombol/i)
  })

  it('redirects App Lock, Privacy Lock, and account problems away from reset', () => {
    expect(redirectFor(erasureCase({ issueType: 'app_lock' }))?.target).toBeNull()
    expect(redirectFor(erasureCase({ issueType: 'privacy_lock' }))?.target).toBeNull()
    expect(redirectFor(erasureCase({ issueType: 'xiaomi_account' }))?.target).toBe('frp-recovery')
    expect(resetGateBlockers(erasureCase({ issueType: 'frp_after_reset' }))).toContain(
      'Jalur reset hanya untuk keluhan lupa PIN/pola/sandi layar.',
    )
    expect(chosenPath(erasureCase({ issueType: 'google_account' }))).toBe('account_recovery')
  })

  it('records accepted consent with time and text version, matching the database constraint', () => {
    const c = grantResetConsent(erasureCase(), NOW)
    expect(c).toMatchObject({
      resetConsentStatus: 'accepted',
      resetConsentAt: NOW.toISOString(),
      consentTextVersion: RESET_CONSENT_TEXT_VERSION,
    })
    expect(RESET_CONSENT_TEXT_VERSION.length).toBeLessThanOrEqual(40)
    expect(chosenPath(c)).toBe('guided_factory_reset')
    expect(caseStatus(c)).toBe('in_progress')
  })

  it('never turns a declined consent into an approved reset', () => {
    const c = declineResetConsent(erasureCase(), NOW)
    expect(c.resetConsentStatus).toBe('declined')
    expect(chosenPath(c)).toBe('data_preservation')
  })

  it('never stores guided_factory_reset as the path without accepted consent', () => {
    expect(chosenPath(erasureCase())).toBe('unresolved')
    expect(chosenPath(erasureCase({ dataPreference: 'preserve' }))).toBe('data_preservation')
    expect(chosenPath(erasureCase({ preservationResult: 'needs_official_service' }))).toBe('official_service')
  })

  it('only allows "Berhasil diverifikasi" after the post-reset checklist is complete', () => {
    const granted = grantResetConsent(erasureCase(), NOW)
    expect(allowedOutcomes(granted)).not.toContain('verified_success')
    expect(() => setOutcome(granted, 'verified_success')).toThrow()

    const done = {
      ...granted,
      postReset: { setupCompleted: true, accountActivated: true, backupRestoredOrNotNeeded: true, newLockSetByOwner: true },
    }
    const verified = setOutcome(done, 'verified_success')
    expect(caseStatus(verified)).toBe('completed')
    expect(caseStatus(setOutcome(granted, 'awaiting_account_recovery'))).toBe('awaiting_owner')
    expect(caseStatus(setOutcome(granted, 'failed'))).toBe('blocked')
  })

  it('reviews Data Preservation from evidence only', () => {
    const c = erasureCase({ dataPreference: 'preserve' })
    expect(preservationReviewed(c)).toBe(false)
    const reviewed = {
      ...c,
      preservation: { officialAccessChecked: true, deviceDetectionRun: true },
      preservationResult: 'no_non_destructive_option' as const,
    }
    expect(preservationReviewed(reviewed)).toBe(true)
  })

  it('builds a summary from structured fields only', () => {
    const summary = caseSummary(grantResetConsent(erasureCase(), NOW))
    expect(summary.length).toBeLessThanOrEqual(4000)
    const lines = summary.split('\n')
    expect(lines[0]).toMatch(/^SLR-20261024-[A-Z0-9]{4} · Xiaomi Redmi Note 13$/)
    expect(lines.slice(1)).toEqual([
      'Masalah: Lupa PIN/pola/sandi layar',
      'Preferensi data: Setuju hapus data',
      'Backup: Sebagian · Akses: Layar terkunci',
      'Kesiapan akun: Siap — akun Xiaomi',
      'Jalur: Guided Factory Reset · Data Preservation: Belum diketahui',
      `Consent reset: Disetujui pelanggan (${NOW.toISOString()})`,
      'Checklist pasca-reset: 0/4',
      'Hasil: Belum diverifikasi',
    ])
  })
})
