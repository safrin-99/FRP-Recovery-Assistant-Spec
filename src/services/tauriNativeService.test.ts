import { beforeEach, describe, expect, it, vi } from 'vitest'

const invoke = vi.fn()
const unlisten = vi.fn()
let eventHandler: ((event: { payload: unknown }) => void) | null = null
const listen = vi.fn((_name: string, handler: (event: { payload: unknown }) => void) => {
  eventHandler = handler
  return Promise.resolve(unlisten)
})

vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => invoke(...args), isTauri: () => false }))
vi.mock('@tauri-apps/api/event', () => ({ listen: (...args: Parameters<typeof listen>) => listen(...args) }))

// File setup sudah memuat modul asli lewat store; muat ulang agar mock di atas dipakai.
vi.resetModules()
const { tauriNativeService, DIAGNOSTIC_EVENT } = await import('./tauriNativeService')

const dto = {
  id: 'device-1',
  brand: 'Samsung',
  model: 'Galaxy A12',
  modelCode: 'SM-A125F',
  androidVersion: '11',
  securityPatch: '2022-03-01',
  transport: 'adb',
  authorization: 'authorized',
  mode: 'normal',
  detectedAtMs: Date.UTC(2026, 9, 23, 3, 0, 0),
  source: 'live',
}

describe('tauriNativeService', () => {
  beforeEach(() => {
    invoke.mockReset()
    listen.mockClear()
    unlisten.mockReset()
    eventHandler = null
  })

  it('validates device DTOs and converts timestamps to ISO', async () => {
    invoke.mockResolvedValueOnce({ devices: [dto], adbAvailable: true, fastbootAvailable: false })
    const result = await tauriNativeService.detectDevices()
    expect(invoke).toHaveBeenCalledWith('detect_devices', {})
    expect(result).toEqual({
      kind: 'ok',
      value: {
        devices: [expect.objectContaining({ id: 'device-1', detectedAt: '2026-10-23T03:00:00.000Z', source: 'live' })],
        adbAvailable: true,
        fastbootAvailable: false,
      },
    })
  })

  it('rejects malformed device data instead of showing it', async () => {
    invoke.mockResolvedValueOnce({ devices: [{ ...dto, model: '<img src=x>' }], adbAvailable: true, fastbootAvailable: true })
    expect(await tauriNativeService.detectDevices()).toEqual({ kind: 'error', message: expect.stringMatching(/tidak valid/) })

    invoke.mockResolvedValueOnce({ devices: [{ ...dto, source: 'demo' }], adbAvailable: true, fastbootAvailable: true })
    expect((await tauriNativeService.detectDevices()).kind).toBe('error')
  })

  it('maps backend command errors to user messages and hides unknown errors', async () => {
    invoke.mockRejectedValueOnce({ code: 'tools-missing', message: 'ADB/Fastboot tidak ditemukan.' })
    expect(await tauriNativeService.detectDevices()).toEqual({ kind: 'error', message: 'ADB/Fastboot tidak ditemukan.' })

    invoke.mockRejectedValueOnce(new Error('C:\\Users\\secret\\stack trace'))
    expect(await tauriNativeService.checkPlatformTools()).toEqual({
      kind: 'error',
      message: 'Perintah aplikasi gagal dijalankan.',
    })
  })

  it('listens before starting a run and only forwards valid events for that run', async () => {
    invoke.mockResolvedValueOnce(null)
    const received: unknown[] = []
    const result = await tauriNativeService.startDiagnosis(42, 'adb-diagnostics', (event) => received.push(event))

    expect(listen).toHaveBeenCalledWith(DIAGNOSTIC_EVENT, expect.any(Function))
    expect(listen.mock.invocationCallOrder[0]).toBeLessThan(invoke.mock.invocationCallOrder[0]!)
    expect(invoke).toHaveBeenCalledWith('start_diagnosis', { runId: 42, method: 'adb-diagnostics' })
    expect(result).toEqual({ kind: 'ok', value: unlisten })

    eventHandler?.({ payload: { kind: 'progress', runId: 42, percent: 40 } })
    eventHandler?.({ payload: { kind: 'progress', runId: 7, percent: 50 } })
    eventHandler?.({ payload: { kind: 'progress', runId: 42, percent: 400 } })
    eventHandler?.({ payload: { kind: 'shell', runId: 42, command: 'rm -rf' } })
    expect(received).toEqual([{ kind: 'progress', runId: 42, percent: 40 }])
  })

  it('stops listening when a run cannot start', async () => {
    invoke.mockRejectedValueOnce({ code: 'busy', message: 'Diagnosis lain sedang berjalan.' })
    const result = await tauriNativeService.startDiagnosis(1, 'fastboot-guide', () => undefined)
    expect(result).toEqual({ kind: 'error', message: 'Diagnosis lain sedang berjalan.' })
    expect(unlisten).toHaveBeenCalled()
  })

  it('sends only link IDs to the backend', async () => {
    invoke.mockResolvedValueOnce(null)
    expect(await tauriNativeService.openOfficialLink('androidHelp')).toEqual({ kind: 'ok', value: undefined })
    expect(invoke).toHaveBeenCalledWith('open_official_link', { link: 'androidHelp' })
  })

  it('validates driver reports', async () => {
    invoke.mockResolvedValueOnce({
      entries: [{ name: 'Android ADB Interface', interface: 'adb', vendorGuess: 'Samsung', status: 'ok', problemCode: null }],
      level: 'ok',
      summary: 'Driver antarmuka ADB/Fastboot terpasang dan aktif.',
    })
    expect((await tauriNativeService.checkDriverStatus()).kind).toBe('ok')

    invoke.mockResolvedValueOnce({ entries: [{ name: 'x', interface: 'printer' }], level: 'ok', summary: '' })
    expect((await tauriNativeService.checkDriverStatus()).kind).toBe('error')
  })
})
