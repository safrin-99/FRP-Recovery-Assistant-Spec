import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEMO_RUN_STAGES, DEMO_STAGE_DELAY_MS } from '@/data/demo'
import { setNativeServiceForTests, unavailableNativeService, type NativeService } from '@/services/nativeService'
import { selectActiveDevice, selectDataPreservation, useAppStore } from './appStore'

const get = () => useAppStore.getState()

function serviceReturning(value: unknown): NativeService {
  return {
    ...unavailableNativeService,
    detectDevices: () => Promise.resolve({ kind: 'ok', value: value as never }),
  }
}

describe('appStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setNativeServiceForTests(unavailableNativeService)
  })

  afterEach(() => {
    vi.useRealTimers()
    setNativeServiceForTests(unavailableNativeService)
  })

  it('starts with no device, no demo, and no logs', () => {
    expect(get().demoMode).toBe(false)
    expect(selectActiveDevice(get())).toBeNull()
    expect(get().logs).toHaveLength(0)
  })

  it('reports detection as unavailable (never "found") when backend is missing', async () => {
    await get().autoDetect()
    expect(get().detection.status).toBe('error')
    expect(get().detection.message).toMatch(/Milestone 2/)
    expect(get().liveDevice).toBeNull()
    expect(get().logs.at(-1)?.source).toBe('live')
  })

  it('maps "no device" from the backend to the empty state', async () => {
    setNativeServiceForTests(serviceReturning(null))
    await get().autoDetect()
    expect(get().detection.status).toBe('none')
  })

  it('rejects invalid device data from the backend', async () => {
    setNativeServiceForTests(serviceReturning({ id: 'x', brand: '<script>' }))
    await get().autoDetect()
    expect(get().detection.status).toBe('error')
    expect(get().liveDevice).toBeNull()
  })

  it('accepts a valid live device and picks the brand', async () => {
    setNativeServiceForTests(
      serviceReturning({
        id: 'session-1',
        brand: 'Xiaomi',
        model: 'Redmi Note',
        modelCode: null,
        androidVersion: '13',
        securityPatch: null,
        transport: 'adb',
        authorization: 'unauthorized',
        detectedAt: new Date().toISOString(),
        source: 'live',
      }),
    )
    await get().autoDetect()
    expect(get().detection.status).toBe('found')
    expect(get().liveDevice?.source).toBe('live')
    expect(get().brand).toBe('xiaomi')
    expect(get().logs.every((entry) => entry.source === 'live')).toBe(true)

    // Perangkat nyata tersambung: Mode Demo tidak boleh menimpanya.
    get().setDemoMode(true)
    expect(get().demoMode).toBe(false)
    expect(selectActiveDevice(get())?.source).toBe('live')
  })

  it('demo mode exposes a device marked as demo and refuses to override a live device', () => {
    get().setDemoMode(true)
    expect(selectActiveDevice(get())?.source).toBe('demo')
    expect(get().logs.every((entry) => entry.source === 'demo')).toBe(true)

    get().setDemoMode(false)
    expect(selectActiveDevice(get())).toBeNull()
    expect(get().logs).toHaveLength(0)
  })

  it('demo auto detect resolves after a delay and stays marked as demo', async () => {
    get().setDemoMode(true)
    const pending = get().autoDetect()
    expect(get().detection.status).toBe('detecting')
    await vi.advanceTimersByTimeAsync(600)
    await pending
    expect(get().detection.status).toBe('found')
    expect(get().liveDevice).toBeNull()
    expect(get().logs.at(-1)?.source).toBe('demo')
  })

  it('does not start a real diagnosis when the backend is unavailable', () => {
    get().startDiagnosis()
    expect(get().run.status).toBe('idle')
    expect(get().logs.at(-1)?.message).toMatch(/belum tersedia/)
  })

  it('runs the demo diagnosis through real stage progress and finishes', async () => {
    get().setDemoMode(true)
    get().startDiagnosis()
    expect(get().run.status).toBe('running')
    expect(get().run.progress).toBe(0)

    await vi.advanceTimersByTimeAsync(DEMO_STAGE_DELAY_MS)
    expect(get().run.progress).toBe(Math.round(100 / DEMO_RUN_STAGES.length))

    await vi.advanceTimersByTimeAsync(DEMO_STAGE_DELAY_MS * DEMO_RUN_STAGES.length)
    expect(get().run.status).toBe('finished')
    expect(get().run.progress).toBe(100)
    expect(get().logs.at(-1)?.message).toMatch(/tidak ada perintah dikirim/)
  })

  it('cancels a running demo diagnosis cleanly and logs the cancellation', async () => {
    get().setDemoMode(true)
    get().startDiagnosis()
    await vi.advanceTimersByTimeAsync(DEMO_STAGE_DELAY_MS * 2)
    const progressAtCancel = get().run.progress
    get().cancelDiagnosis()
    expect(get().run.status).toBe('cancelled')
    expect(get().logs.at(-1)?.message).toMatch(/dibatalkan/)

    await vi.advanceTimersByTimeAsync(DEMO_STAGE_DELAY_MS * 10)
    expect(get().run.status).toBe('cancelled')
    expect(get().run.progress).toBe(progressAtCancel)
  })

  it('clears logs', () => {
    get().setDemoMode(true)
    expect(get().logs.length).toBeGreaterThan(0)
    get().clearLogs()
    expect(get().logs).toHaveLength(0)
  })

  it('activates Data Preservation Mode only when the screen is locked and data/backup is at risk', () => {
    expect(selectDataPreservation(get())).toBe(false)
    get().setScreenLocked('yes')
    expect(selectDataPreservation(get())).toBe(true) // backup unknown
    get().setBackupAvailable('yes')
    expect(selectDataPreservation(get())).toBe(false)
    get().setDataImportant('yes')
    expect(selectDataPreservation(get())).toBe(true)
    get().setScreenLocked('no')
    expect(selectDataPreservation(get())).toBe(false)
  })
})
