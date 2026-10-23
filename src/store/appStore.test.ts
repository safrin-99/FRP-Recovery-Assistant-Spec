import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEMO_RUN_STAGES, DEMO_STAGE_DELAY_MS } from '@/data/demo'
import {
  setNativeServiceForTests,
  unavailableNativeService,
  type DiagnosticEvent,
  type NativeService,
} from '@/services/nativeService'
import type { DeviceSnapshot } from '@/types/domain'
import { selectActiveDevice, selectDataPreservation, selectDiagnosisAvailability, useAppStore } from './appStore'

const get = () => useAppStore.getState()

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never
type EventInput = DistributiveOmit<DiagnosticEvent, 'runId'> & { runId?: number }

function liveDevice(overrides: Partial<DeviceSnapshot> = {}): DeviceSnapshot {
  return {
    id: 'device-1',
    brand: 'Xiaomi',
    model: 'Redmi Note 10',
    modelCode: 'M2101K7AG',
    androidVersion: '13',
    securityPatch: '2024-05-01',
    transport: 'adb',
    authorization: 'authorized',
    mode: 'normal',
    detectedAt: new Date().toISOString(),
    source: 'live',
    ...overrides,
  }
}

/** Layanan palsu yang mensimulasikan backend desktop; event dikirim manual lewat `emit`. */
function fakeDesktopService(devices: DeviceSnapshot[] = []) {
  let handler: ((event: DiagnosticEvent) => void) | null = null
  const unlisten = vi.fn()
  const service = {
    ...unavailableNativeService,
    available: true,
    detectDevices: vi.fn(() =>
      Promise.resolve({ kind: 'ok' as const, value: { devices, adbAvailable: true, fastbootAvailable: true } }),
    ),
    startDiagnosis: vi.fn((_runId: number, _method: string, onEvent: (event: DiagnosticEvent) => void) => {
      handler = onEvent
      return Promise.resolve({ kind: 'ok' as const, value: unlisten })
    }),
    cancelDiagnosis: vi.fn(() => Promise.resolve()),
    openOfficialLink: vi.fn(() => Promise.resolve({ kind: 'ok' as const, value: undefined })),
  } satisfies NativeService
  const runId = () => service.startDiagnosis.mock.calls[0]?.[0] ?? -1
  const emit = (event: EventInput) => handler?.({ runId: runId(), ...event } as DiagnosticEvent)
  return { service, emit, runId, unlisten }
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

  it('reports detection as unavailable (never "found") outside the desktop app', async () => {
    await get().autoDetect()
    expect(get().detection.status).toBe('error')
    expect(get().detection.message).toMatch(/aplikasi desktop/)
    expect(get().liveDevice).toBeNull()
    expect(get().logs.at(-1)?.source).toBe('live')
  })

  it('maps "no device" from the backend to the empty state and clears a stale device', async () => {
    useAppStore.setState({ liveDevice: liveDevice() })
    setNativeServiceForTests(fakeDesktopService([]).service)
    await get().autoDetect()
    expect(get().detection.status).toBe('none')
    expect(get().liveDevice).toBeNull()
  })

  it('reports backend errors without inventing a device', async () => {
    setNativeServiceForTests({
      ...fakeDesktopService().service,
      detectDevices: () => Promise.resolve({ kind: 'error', message: 'ADB/Fastboot tidak ditemukan.' }),
    })
    await get().autoDetect()
    expect(get().detection).toEqual({ status: 'error', message: 'ADB/Fastboot tidak ditemukan.' })
    expect(get().liveDevice).toBeNull()
  })

  it('prefers an authorized device, picks its brand, and replaces demo data', async () => {
    get().setDemoMode(true)
    setNativeServiceForTests(
      fakeDesktopService([
        liveDevice({ id: 'device-1', brand: null, model: null, authorization: 'unauthorized' }),
        liveDevice({ id: 'device-2' }),
      ]).service,
    )
    await get().autoDetect()
    expect(get().detection.status).toBe('found')
    expect(get().liveDevice?.id).toBe('device-2')
    expect(get().brand).toBe('xiaomi')
    expect(get().demoMode).toBe(false)
    expect(get().logs.every((entry) => entry.source === 'live')).toBe(true)
    expect(get().logs.some((entry) => entry.message.includes('2 perangkat terdeteksi'))).toBe(true)

    // Perangkat nyata tersambung: Mode Demo tidak boleh menimpanya.
    get().setDemoMode(true)
    expect(get().demoMode).toBe(false)
    expect(selectActiveDevice(get())?.source).toBe('live')
  })

  it('labels unauthorized devices honestly', async () => {
    setNativeServiceForTests(fakeDesktopService([liveDevice({ authorization: 'unauthorized', brand: null })]).service)
    await get().autoDetect()
    expect(get().detection.message).toBe('Perangkat ditemukan, belum diotorisasi.')
    expect(get().logs.at(-1)?.level).toBe('warning')
  })

  it('demo mode exposes a device marked as demo and turns off cleanly', () => {
    get().setDemoMode(true)
    expect(selectActiveDevice(get())?.source).toBe('demo')
    expect(get().logs.every((entry) => entry.source === 'demo')).toBe(true)

    get().setDemoMode(false)
    expect(selectActiveDevice(get())).toBeNull()
    expect(get().logs).toHaveLength(0)
  })

  it('demo auto detect without a backend resolves after a delay and stays marked as demo', async () => {
    get().setDemoMode(true)
    const pending = get().autoDetect()
    expect(get().detection.status).toBe('detecting')
    await vi.advanceTimersByTimeAsync(600)
    await pending
    expect(get().detection.status).toBe('found')
    expect(get().liveDevice).toBeNull()
    expect(get().logs.at(-1)?.source).toBe('demo')
  })

  it('refuses device diagnosis outside the desktop app', () => {
    expect(selectDiagnosisAvailability(get())).toEqual({ enabled: false, reason: expect.stringMatching(/aplikasi desktop/) })
    get().startDiagnosis()
    expect(get().run.status).toBe('idle')
    expect(get().logs.at(-1)?.message).toMatch(/aplikasi desktop/)
  })

  it('runs the demo diagnosis through staged progress and finishes', async () => {
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

  it('drives a live diagnosis from backend events', async () => {
    const fake = fakeDesktopService()
    setNativeServiceForTests(fake.service)
    expect(selectDiagnosisAvailability(get()).enabled).toBe(true)

    get().startDiagnosis()
    await vi.advanceTimersByTimeAsync(0)
    expect(fake.service.startDiagnosis).toHaveBeenCalledWith(expect.any(Number), 'adb-diagnostics', expect.any(Function))
    expect(get().run.status).toBe('running')

    fake.emit({ kind: 'stage', index: 0, count: 5, label: 'Memeriksa Android Platform-Tools' })
    fake.emit({ kind: 'log', level: 'success', category: 'ADB', message: 'ADB 37.0.1 ditemukan.' })
    fake.emit({ kind: 'progress', percent: 20 })
    // Event milik run lain diabaikan.
    fake.emit({ kind: 'progress', percent: 99, runId: fake.runId() + 1 })
    expect(get().run).toEqual({ status: 'running', progress: 20, stage: 'Memeriksa Android Platform-Tools' })

    // DTO backend memakai detectedAtMs; kunci lain yang tidak dikenal dibuang oleh Zod.
    fake.emit({ kind: 'device', device: { ...liveDevice(), detectedAtMs: Date.now() } })
    expect(get().liveDevice?.model).toBe('Redmi Note 10')

    fake.emit({ kind: 'finished', outcome: 'ok', summary: 'Koneksi ADB normal.' })
    expect(get().run).toEqual({ status: 'finished', progress: 100, stage: null })
    expect(get().logs.at(-1)).toMatchObject({ level: 'success', message: 'Koneksi ADB normal.', source: 'live' })
    expect(fake.unlisten).toHaveBeenCalled()
  })

  it('rejects invalid device payloads from run events', async () => {
    const fake = fakeDesktopService()
    setNativeServiceForTests(fake.service)
    get().startDiagnosis()
    await vi.advanceTimersByTimeAsync(0)
    fake.emit({ kind: 'device', device: { id: 'x', brand: '<script>' } })
    expect(get().liveDevice).toBeNull()
    expect(get().logs.at(-1)?.message).toMatch(/ditolak/)
  })

  it('cancels a live diagnosis through the backend', async () => {
    const fake = fakeDesktopService()
    setNativeServiceForTests(fake.service)
    get().startDiagnosis()
    await vi.advanceTimersByTimeAsync(0)
    get().cancelDiagnosis()
    expect(fake.service.cancelDiagnosis).toHaveBeenCalledWith(fake.runId())
    expect(get().run.stage).toBe('Membatalkan…')
    fake.emit({ kind: 'cancelled' })
    expect(get().run.status).toBe('cancelled')
    expect(get().logs.at(-1)?.message).toMatch(/dibatalkan/)
  })

  it('marks failed runs and backend start errors', async () => {
    const fake = fakeDesktopService()
    setNativeServiceForTests(fake.service)
    get().startDiagnosis()
    await vi.advanceTimersByTimeAsync(0)
    fake.emit({ kind: 'failed', message: 'Alat tidak merespons dalam 20 detik.' })
    expect(get().run.status).toBe('failed')

    setNativeServiceForTests({
      ...fake.service,
      startDiagnosis: () => Promise.resolve({ kind: 'error', message: 'Diagnosis lain sedang berjalan.' }),
    })
    get().startDiagnosis()
    await vi.advanceTimersByTimeAsync(0)
    expect(get().run.status).toBe('failed')
    expect(get().logs.at(-1)?.message).toMatch(/Diagnosis lain sedang berjalan/)
  })

  it('opens guides instead of device commands for account and official-service paths', async () => {
    const fake = fakeDesktopService()
    setNativeServiceForTests(fake.service)

    get().selectMethod('account-recovery')
    get().startDiagnosis()
    expect(get().page).toBe('frp-recovery')
    expect(fake.service.startDiagnosis).not.toHaveBeenCalled()

    get().selectMethod('official-service')
    get().selectBrand('samsung')
    get().startDiagnosis()
    await vi.advanceTimersByTimeAsync(0)
    expect(fake.service.openOfficialLink).toHaveBeenCalledWith('samsungAccount')
    expect(fake.service.startDiagnosis).not.toHaveBeenCalled()

    // Tanpa backend pun jalur panduan tetap tersedia.
    setNativeServiceForTests(unavailableNativeService)
    expect(selectDiagnosisAvailability(get()).enabled).toBe(true)
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
