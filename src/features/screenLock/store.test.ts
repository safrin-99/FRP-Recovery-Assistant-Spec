import { describe, expect, it } from 'vitest'
import type { DeviceSnapshot } from '@/types/domain'
import { useAppStore } from '@/store/appStore'
import { useScreenLockStore } from './store'

const NOW = new Date().toISOString()

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
    detectedAt: NOW,
    source: 'live',
    ...overrides,
  }
}

describe('captureDetectedDevice', () => {
  it('records live evidence onto the current ticket', () => {
    useScreenLockStore.getState().startCase('xiaomi', null)
    expect(useScreenLockStore.getState().current?.deviceEvidence).toBeNull()

    useAppStore.setState({ liveDevice: liveDevice() })
    useScreenLockStore.getState().captureDetectedDevice()

    const c = useScreenLockStore.getState().current!
    expect(c.deviceEvidence).toMatchObject({ sessionId: 'device-1', transport: 'adb' })
    expect(c.model).toBe('Redmi Note 13')
    expect(c.modelSource).toBe('detected')
  })

  it('ignores demo devices', () => {
    useScreenLockStore.getState().startCase('samsung', null)
    useAppStore.setState({ liveDevice: null, demoMode: true })
    useScreenLockStore.getState().captureDetectedDevice()
    expect(useScreenLockStore.getState().current?.deviceEvidence).toBeNull()
  })

  it('revokes an accepted reset consent when detection changes the device model', () => {
    useScreenLockStore.getState().startCase('xiaomi', null)
    useScreenLockStore.getState().update({
      issueType: 'screen_pin_pattern',
      accessState: 'locked_screen',
      dataPreference: 'not_important',
      backupStatus: 'none',
      accountReadiness: 'xiaomi_ready',
      ownerAuthorizationConfirmed: true,
      dataLossExplained: true,
      accountVerificationExplained: true,
    })
    useScreenLockStore.getState().grantConsent()
    expect(useScreenLockStore.getState().current?.resetConsentStatus).toBe('accepted')

    useAppStore.setState({ liveDevice: liveDevice({ model: 'Redmi Note 99' }) })
    useScreenLockStore.getState().captureDetectedDevice()

    const c = useScreenLockStore.getState().current!
    expect(c.model).toBe('Redmi Note 99')
    expect(c.deviceEvidence).not.toBeNull()
    expect(c.resetConsentStatus).toBe('not_requested')
  })
})
