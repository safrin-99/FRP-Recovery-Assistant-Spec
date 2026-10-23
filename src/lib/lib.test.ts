import { describe, expect, it } from 'vitest'
import { DeviceSnapshotSchema } from '@/types/domain'
import { useSettingsStore } from '@/store/settingsStore'
import { isSafeExternalUrl } from './external'
import { formatLogTime, orUnknown } from './format'

describe('format', () => {
  it('formats log time as HH:mm:ss', () => {
    expect(formatLogTime(new Date(2026, 9, 23, 10, 24, 12).toISOString())).toBe('10:24:12')
  })

  it('handles invalid timestamps', () => {
    expect(formatLogTime('not-a-date')).toBe('--:--:--')
  })

  it('shows an em dash for unknown values', () => {
    expect(orUnknown(null)).toBe('—')
    expect(orUnknown('')).toBe('—')
    expect(orUnknown('11')).toBe('11')
  })
})

describe('external links', () => {
  it('only allows https URLs', () => {
    expect(isSafeExternalUrl('https://developer.android.com/tools')).toBe(true)
    expect(isSafeExternalUrl('http://example.com')).toBe(false)
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeExternalUrl('file:///C:/Windows')).toBe(false)
    expect(isSafeExternalUrl('not a url')).toBe(false)
  })
})

describe('DeviceSnapshotSchema (untrusted device data)', () => {
  const valid = {
    id: 'session-1',
    brand: 'Samsung',
    model: 'Galaxy A12',
    modelCode: 'SM-A125F',
    androidVersion: '11',
    securityPatch: '2022-03-01',
    transport: 'adb',
    authorization: 'authorized',
    detectedAt: new Date().toISOString(),
    source: 'live',
  }

  it('accepts well-formed data', () => {
    expect(DeviceSnapshotSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects markup, control characters, and over-long values', () => {
    expect(DeviceSnapshotSchema.safeParse({ ...valid, model: '<img src=x>' }).success).toBe(false)
    expect(DeviceSnapshotSchema.safeParse({ ...valid, brand: 'a\u0000b' }).success).toBe(false)
    expect(DeviceSnapshotSchema.safeParse({ ...valid, model: 'x'.repeat(65) }).success).toBe(false)
  })

  it('rejects unknown transport/authorization/source values', () => {
    expect(DeviceSnapshotSchema.safeParse({ ...valid, transport: 'wifi' }).success).toBe(false)
    expect(DeviceSnapshotSchema.safeParse({ ...valid, authorization: 'unlocked' }).success).toBe(false)
    expect(DeviceSnapshotSchema.safeParse({ ...valid, source: 'guess' }).success).toBe(false)
  })
})

describe('settingsStore validation', () => {
  it('keeps AI disabled and rejects unimplemented options', () => {
    const { update } = useSettingsStore.getState()
    expect(useSettingsStore.getState().aiProvider).toBe('disabled')
    expect(update({ aiProvider: 'cloud-byok' })).toBe(false)
    expect(update({ theme: 'light' })).toBe(false)
    expect(update({ aiHistoryEnabled: true })).toBe(false)
    expect(useSettingsStore.getState()).toMatchObject({ theme: 'dark', aiProvider: 'disabled', aiHistoryEnabled: false })
    expect(update({ theme: 'dark' })).toBe(true)
  })
})
