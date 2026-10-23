import { describe, expect, it } from 'vitest'
import type { DeviceSnapshot } from '@/types/domain'
import { deviceEvidenceFrom, identityVerified, resolveCapability } from './capabilities'
import { canRequestConsent, createCase, preflight } from './engine'
import type { RecoveryCase } from './model'

const NOW = new Date(2026, 9, 24, 10, 0, 0)

function liveDevice(overrides: Partial<DeviceSnapshot> = {}): DeviceSnapshot {
  return {
    id: 'device-1',
    brand: 'Xiaomi',
    model: 'Redmi Note 13',
    modelCode: '2312DRA50G',
    androidVersion: '14',
    securityPatch: '2026-09-01',
    transport: 'adb',
    authorization: 'authorized',
    mode: 'normal',
    detectedAt: NOW.toISOString(),
    source: 'live',
    ...overrides,
  }
}

function erasureCase(overrides: Partial<RecoveryCase> = {}): RecoveryCase {
  return {
    ...createCase(NOW, 'xiaomi', null),
    issueType: 'screen_pin_pattern',
    accessState: 'locked_screen',
    dataPreference: 'not_important',
    backupStatus: 'none',
    accountReadiness: 'xiaomi_ready',
    ownerAuthorizationConfirmed: true,
    ownerAuthorizedAt: NOW.toISOString(),
    dataLossExplained: true,
    accountVerificationExplained: true,
    ...overrides,
  }
}

describe('capability matrix', () => {
  it('records device evidence only from a live detection, never from demo', () => {
    expect(deviceEvidenceFrom(liveDevice())).toMatchObject({ sessionId: 'device-1', transport: 'adb', mode: 'normal' })
    expect(deviceEvidenceFrom(liveDevice({ source: 'demo' }))).toBeNull()
    expect(deviceEvidenceFrom(null)).toBeNull()
    // Tidak membocorkan serial: hanya ID sesi internal.
    expect(JSON.stringify(deviceEvidenceFrom(liveDevice()))).not.toMatch(/R58|serial/i)
  })

  it('never reports reset as app-executed — always guidance on the device', () => {
    const cap = resolveCapability(erasureCase())
    expect(cap.resetExecution).toBe('guidance_on_device')
    expect(cap.note).toMatch(/tidak mengirim perintah wipe\/flash\/unlock dari komputer/i)
    expect(cap.verifyBy).toMatch(/Perintah terkirim bukan bukti keberhasilan/i)
  })

  it('does not offer fastboot wipe/unlock even when the device is in bootloader mode', () => {
    const ev = deviceEvidenceFrom(liveDevice({ transport: 'fastboot', mode: 'bootloader', authorization: 'unavailable' }))
    const cap = resolveCapability(erasureCase({ deviceEvidence: ev }))
    expect(cap.resetExecution).toBe('guidance_on_device')
    expect(cap.note).toMatch(/tidak menjalankan `fastboot erase`\/`-w`\/unlock/i)
  })

  it('marks reset not applicable for non-screen-lock issues', () => {
    expect(resolveCapability(erasureCase({ issueType: 'google_account' })).resetExecution).toBe('not_applicable')
  })

  it('treats identity as verified only with real detection evidence', () => {
    expect(identityVerified(erasureCase())).toBe(false)
    const withEv = erasureCase({ deviceEvidence: deviceEvidenceFrom(liveDevice()) })
    expect(identityVerified(withEv)).toBe(true)
    expect(resolveCapability(withEv).canReadStatus).toBe(true)
  })

  it('warns in preflight when identity is unverified but does not block consent', () => {
    const noEv = erasureCase()
    const identity = preflight(noEv).find((item) => item.id === 'identity')
    expect(identity?.status).toBe('warning')
    // Layar terkunci total sering tak terdeteksi: consent tetap boleh diminta.
    expect(canRequestConsent(noEv)).toBe(true)

    const withEv = erasureCase({ deviceEvidence: deviceEvidenceFrom(liveDevice()) })
    expect(preflight(withEv).find((item) => item.id === 'identity')?.status).toBe('ok')
  })

  it('captures evidence on the new case when a live device is attached', () => {
    const c = createCase(NOW, 'xiaomi', liveDevice())
    expect(c.deviceEvidence).toMatchObject({ sessionId: 'device-1', transport: 'adb' })
    expect(c.modelSource).toBe('detected')
    expect(createCase(NOW, 'xiaomi', liveDevice({ source: 'demo' })).deviceEvidence).toBeNull()
  })
})
