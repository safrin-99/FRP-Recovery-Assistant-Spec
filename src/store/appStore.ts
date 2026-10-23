import { create } from 'zustand'
import { BRAND_LABELS, officialServiceLink } from '@/data/catalog'
import { createDemoDevice, DEMO_RUN_STAGES, DEMO_STAGE_DELAY_MS } from '@/data/demo'
import { openOfficialLink } from '@/lib/external'
import { usbHintFromReport } from '@/lib/usbHint'
import { deviceFromDto, nativeService, type DiagnosticEvent } from '@/services/nativeService'
import type {
  BackupAnswer,
  BrandId,
  DetectionStatus,
  DeviceMethodId,
  DeviceSnapshot,
  LogCategory,
  LogEntry,
  LogLevel,
  MethodId,
  PageId,
  RunStatus,
  UserAnswer,
} from '@/types/domain'

const MAX_LOGS = 500
const DEMO_DETECT_DELAY_MS = 500
export const NO_DEVICE_MESSAGE = 'Tidak ada perangkat.'

let logSeq = 0
let runTimer: ReturnType<typeof setTimeout> | null = null
let detectTimer: ReturnType<typeof setTimeout> | null = null
/** Run diagnosis nyata yang sedang berjalan (backend Rust). */
let liveRun: { runId: number; unlisten: (() => void) | null } | null = null

function makeLog(
  level: LogLevel,
  category: LogCategory,
  message: string,
  source: LogEntry['source'],
  offsetMs = 0,
): LogEntry {
  logSeq += 1
  return {
    id: `log-${logSeq}`,
    timestamp: new Date(Date.now() + offsetMs).toISOString(),
    level,
    category,
    message,
    source,
  }
}

function clearTimers(): void {
  if (runTimer) clearTimeout(runTimer)
  if (detectTimer) clearTimeout(detectTimer)
  runTimer = null
  detectTimer = null
}

function endLiveRun(): void {
  liveRun?.unlisten?.()
  liveRun = null
}

/** ID run untuk backend (u32, < 2^31). */
function newRunId(): number {
  const buffer = new Uint32Array(1)
  crypto.getRandomValues(buffer)
  return (buffer[0] ?? 1) >>> 1
}

function brandFromText(text: string | null): BrandId | null {
  if (!text) return null
  const wanted = text.trim().toLowerCase()
  const match = (Object.entries(BRAND_LABELS) as Array<[BrandId, string]>).find(
    ([id, label]) => id !== 'other' && label.toLowerCase() === wanted,
  )
  return match ? match[0] : null
}

function foundMessage(device: DeviceSnapshot): string {
  if (device.transport === 'fastboot') return 'Perangkat ditemukan (mode Fastboot).'
  if (device.authorization === 'unauthorized') return 'Perangkat ditemukan, belum diotorisasi.'
  if (device.authorization === 'offline') return 'Perangkat ditemukan, tetapi offline.'
  return 'Perangkat ditemukan.'
}

const OUTCOME_LEVEL: Record<'ok' | 'warning' | 'error', LogLevel> = {
  ok: 'success',
  warning: 'warning',
  error: 'error',
}

export interface AppState {
  page: PageId
  helpOpen: boolean
  demoMode: boolean
  /** Perangkat nyata dari backend (tervalidasi Zod). */
  liveDevice: DeviceSnapshot | null
  method: MethodId
  brand: BrandId
  detection: { status: DetectionStatus; message: string | null }
  run: { status: RunStatus; progress: number | null; stage: string | null }
  logs: LogEntry[]
  /** Pernyataan pengguna untuk Data Preservation Mode (label: "Dari pengguna"). */
  screenLocked: UserAnswer
  dataImportant: UserAnswer
  backupAvailable: BackupAnswer

  setPage: (page: PageId) => void
  setHelpOpen: (open: boolean) => void
  setDemoMode: (enabled: boolean) => void
  selectMethod: (method: MethodId) => void
  selectBrand: (brand: BrandId) => void
  autoDetect: () => Promise<void>
  startDiagnosis: () => void
  cancelDiagnosis: () => void
  clearLogs: () => void
  /** Catat kejadian dari fitur lain (mis. kasus Screen Lock Recovery) ke log sesi aktif. */
  addLog: (level: LogLevel, category: LogCategory, message: string) => void
  setScreenLocked: (answer: UserAnswer) => void
  setDataImportant: (answer: UserAnswer) => void
  setBackupAvailable: (answer: BackupAnswer) => void
}

const initialState = {
  page: 'home' as PageId,
  helpOpen: false,
  demoMode: false,
  liveDevice: null,
  method: 'adb-diagnostics' as MethodId,
  brand: 'other' as BrandId,
  detection: { status: 'idle' as DetectionStatus, message: null },
  run: { status: 'idle' as RunStatus, progress: null, stage: null },
  logs: [] as LogEntry[],
  screenLocked: 'unanswered' as UserAnswer,
  dataImportant: 'unanswered' as UserAnswer,
  backupAvailable: 'unknown' as BackupAnswer,
}

export const useAppStore = create<AppState>()((set, get) => {
  const pushLog = (entry: LogEntry): void =>
    set((state) => ({ logs: [...state.logs, entry].slice(-MAX_LOGS) }))

  /** Perangkat nyata selalu menang atas demo (PRD §8): demo dimatikan dan log demo dibuang. */
  const adoptLiveDevice = (device: DeviceSnapshot): void =>
    set((state) => ({
      liveDevice: device,
      demoMode: false,
      brand: brandFromText(device.brand) ?? state.brand,
      detection: { status: 'found', message: foundMessage(device) },
      logs: state.logs.filter((entry) => entry.source !== 'demo'),
    }))

  const handleRunEvent = (event: DiagnosticEvent): void => {
    if (!liveRun || event.runId !== liveRun.runId) return
    switch (event.kind) {
      case 'stage':
        set((state) => ({ run: { ...state.run, stage: event.label } }))
        pushLog(makeLog('info', 'Sistem', `${event.label}…`, 'live'))
        break
      case 'progress':
        set((state) => ({ run: { ...state.run, progress: event.percent } }))
        break
      case 'log':
        pushLog(makeLog(event.level, event.category, event.message, 'live'))
        break
      case 'device': {
        const device = deviceFromDto(event.device)
        if (device) adoptLiveDevice(device)
        else pushLog(makeLog('error', 'Perangkat', 'Data perangkat dari backend ditolak (validasi gagal).', 'live'))
        break
      }
      case 'finished':
        endLiveRun()
        set({ run: { status: event.outcome === 'error' ? 'failed' : 'finished', progress: 100, stage: null } })
        pushLog(makeLog(OUTCOME_LEVEL[event.outcome], 'Sistem', event.summary, 'live'))
        break
      case 'cancelled':
        endLiveRun()
        set((state) => ({ run: { status: 'cancelled', progress: state.run.progress, stage: null } }))
        pushLog(makeLog('warning', 'Sistem', 'Diagnosis dibatalkan oleh pengguna.', 'live'))
        break
      case 'failed':
        endLiveRun()
        set((state) => ({ run: { status: 'failed', progress: state.run.progress, stage: null } }))
        pushLog(makeLog('error', 'Sistem', event.message, 'live'))
        break
    }
  }

  const startLiveRun = async (method: DeviceMethodId): Promise<void> => {
    const runId = newRunId()
    liveRun = { runId, unlisten: null }
    set({ run: { status: 'running', progress: 0, stage: 'Menyiapkan diagnosis…' } })
    pushLog(
      makeLog('info', 'Sistem', `Memulai diagnosis ${method === 'adb-diagnostics' ? 'ADB' : 'Fastboot'} (hanya membaca status).`, 'live'),
    )
    const result = await nativeService.startDiagnosis(runId, method, handleRunEvent)
    if (result.kind !== 'ok') {
      if (liveRun?.runId === runId) liveRun = null
      set({ run: { status: 'failed', progress: 0, stage: null } })
      const message = result.kind === 'error' ? result.message : result.reason
      pushLog(makeLog('error', 'Sistem', `Diagnosis tidak dapat dimulai: ${message}`, 'live'))
      return
    }
    // Run bisa sudah selesai sebelum janji ini kembali; jangan biarkan listener menggantung.
    if (liveRun?.runId === runId) liveRun.unlisten = result.value
    else result.value()
  }

  const startDemoRun = (): void => {
    const stageCount = DEMO_RUN_STAGES.length
    set({ run: { status: 'running', progress: 0, stage: DEMO_RUN_STAGES[0] } })
    pushLog(makeLog('info', 'Sistem', 'Memulai diagnosis contoh (tidak ada perintah dikirim ke perangkat).', 'demo'))

    const step = (index: number): void => {
      const label = DEMO_RUN_STAGES[index]
      if (label === undefined) return
      pushLog(makeLog('info', 'Sistem', label, 'demo'))
      set({ run: { status: 'running', progress: Math.round(((index + 1) / stageCount) * 100), stage: label } })
      if (index + 1 < stageCount) {
        runTimer = setTimeout(() => step(index + 1), DEMO_STAGE_DELAY_MS)
      } else {
        runTimer = setTimeout(() => {
          set({ run: { status: 'finished', progress: 100, stage: null } })
          pushLog(makeLog('success', 'Sistem', 'Simulasi selesai — tidak ada perintah dikirim ke perangkat.', 'demo'))
          runTimer = null
        }, DEMO_STAGE_DELAY_MS)
      }
    }
    runTimer = setTimeout(() => step(0), DEMO_STAGE_DELAY_MS)
  }

  return {
    ...initialState,

    setPage: (page) => set({ page }),
    setHelpOpen: (helpOpen) => set({ helpOpen }),

    setDemoMode: (enabled) => {
      const state = get()
      if (enabled === state.demoMode) return
      if (state.run.status === 'running') return
      clearTimers()
      if (enabled) {
        if (state.liveDevice) return // perangkat nyata tersambung: demo tidak boleh menimpa
        set((s) => ({
          demoMode: true,
          brand: 'samsung',
          detection: { status: 'idle', message: null },
          run: { status: 'idle', progress: null, stage: null },
          logs: [
            ...s.logs,
            makeLog('info', 'Perangkat', 'Mode Demo aktif — data di bawah adalah contoh, bukan perangkat nyata.', 'demo', -3000),
            makeLog('info', 'Perangkat', 'Perangkat contoh ditampilkan: Samsung Galaxy A12.', 'demo', -2000),
            makeLog('warning', 'Sistem', 'Status FRP tidak dapat diverifikasi melalui koneksi ini.', 'demo', -1000),
            makeLog('info', 'Sistem', 'Siap menjalankan diagnosis contoh.', 'demo'),
          ].slice(-MAX_LOGS),
        }))
      } else {
        set((s) => ({
          demoMode: false,
          brand: 'other',
          detection: { status: 'idle', message: null },
          run: { status: 'idle', progress: null, stage: null },
          logs: s.logs.filter((entry) => entry.source !== 'demo'),
        }))
      }
    },

    selectMethod: (method) => set({ method }),
    selectBrand: (brand) => set({ brand }),

    autoDetect: async () => {
      if (get().detection.status === 'detecting') return

      // Tanpa backend (browser/pratinjau) dan Mode Demo aktif: tampilkan perangkat contoh.
      if (!nativeService.available && get().demoMode) {
        set({ detection: { status: 'detecting', message: 'Mendeteksi…' } })
        pushLog(makeLog('info', 'Perangkat', 'Mendeteksi perangkat contoh…', 'demo'))
        await new Promise<void>((resolve) => {
          detectTimer = setTimeout(resolve, DEMO_DETECT_DELAY_MS)
        })
        if (!get().demoMode) return // Mode Demo dimatikan saat menunggu
        const device = createDemoDevice()
        set({ brand: 'samsung', detection: { status: 'found', message: 'Perangkat contoh ditemukan.' } })
        pushLog(
          makeLog('success', 'Perangkat', `Perangkat contoh ditampilkan: ${device.brand ?? ''} ${device.model ?? ''}`.trim(), 'demo'),
        )
        return
      }

      set({ detection: { status: 'detecting', message: 'Mendeteksi…' } })
      pushLog(makeLog('info', 'Perangkat', 'Mendeteksi perangkat melalui ADB/Fastboot…', 'live'))
      const outcome = await nativeService.detectDevices()
      if (outcome.kind === 'unavailable') {
        set({ detection: { status: 'error', message: outcome.reason } })
        pushLog(makeLog('warning', 'Sistem', `Deteksi tidak tersedia: ${outcome.reason}`, 'live'))
        return
      }
      if (outcome.kind === 'error') {
        set({ detection: { status: 'error', message: outcome.message } })
        pushLog(makeLog('error', 'Perangkat', `Deteksi gagal: ${outcome.message}`, 'live'))
        return
      }
      const { devices } = outcome.value
      const primary = devices.find((device) => device.authorization === 'authorized') ?? devices[0]
      if (!primary) {
        // Jelaskan penyebabnya bila Windows melihat ponsel tanpa antarmuka ADB (mis. USB debugging mati).
        const report = await nativeService.checkDriverStatus()
        const hint = report.kind === 'ok' ? usbHintFromReport(report.value) : null
        set({ liveDevice: null, detection: { status: 'none', message: hint ?? NO_DEVICE_MESSAGE } })
        pushLog(makeLog('info', 'Perangkat', 'Tidak ada perangkat terdeteksi melalui ADB/Fastboot.', 'live'))
        if (hint) pushLog(makeLog('warning', 'USB', hint, 'live'))
        return
      }
      adoptLiveDevice(primary)
      const label = [primary.brand, primary.model].filter(Boolean).join(' ') || 'tanpa info model'
      pushLog(
        makeLog(
          primary.authorization === 'authorized' || primary.transport === 'fastboot' ? 'success' : 'warning',
          'Perangkat',
          `${foundMessage(primary)} (${label})`,
          'live',
        ),
      )
      if (devices.length > 1) {
        pushLog(makeLog('info', 'Perangkat', `${devices.length} perangkat terdeteksi; menampilkan satu perangkat.`, 'live'))
      }
    },

    startDiagnosis: () => {
      const state = get()
      if (state.run.status === 'running') return

      // Jalur tanpa perintah perangkat: buka panduan/tautan resmi.
      if (state.method === 'account-recovery') {
        pushLog(makeLog('info', 'Sistem', 'Membuka checklist pemulihan akun resmi.', 'live'))
        set({ page: 'frp-recovery' })
        return
      }
      if (state.method === 'official-service') {
        const link = officialServiceLink(state.brand)
        pushLog(makeLog('info', 'Sistem', `Membuka layanan resmi: ${link.label}.`, 'live'))
        void openOfficialLink(link).then((ok) => {
          if (!ok) pushLog(makeLog('warning', 'Sistem', 'Tautan resmi tidak dapat dibuka di browser.', 'live'))
        })
        return
      }

      if (state.demoMode && !state.liveDevice) {
        startDemoRun()
        return
      }
      if (!nativeService.available) {
        pushLog(makeLog('warning', 'Sistem', 'Diagnosis perangkat hanya tersedia di aplikasi desktop.', 'live'))
        return
      }
      void startLiveRun(state.method)
    },

    cancelDiagnosis: () => {
      if (get().run.status !== 'running') return
      if (liveRun) {
        set((state) => ({ run: { ...state.run, stage: 'Membatalkan…' } }))
        void nativeService.cancelDiagnosis(liveRun.runId)
        return
      }
      if (runTimer) clearTimeout(runTimer)
      runTimer = null
      set((s) => ({ run: { status: 'cancelled', progress: s.run.progress, stage: null } }))
      pushLog(makeLog('warning', 'Sistem', 'Diagnosis dibatalkan oleh pengguna.', 'demo'))
    },

    clearLogs: () => set({ logs: [] }),
    addLog: (level, category, message) => pushLog(makeLog(level, category, message, 'live')),

    setScreenLocked: (screenLocked) => set({ screenLocked }),
    setDataImportant: (dataImportant) => set({ dataImportant }),
    setBackupAvailable: (backupAvailable) => set({ backupAvailable }),
  }
})

/** Perangkat yang sedang ditampilkan: live menang atas demo (PRD §8). */
export function selectActiveDevice(state: AppState): DeviceSnapshot | null {
  if (state.liveDevice) return state.liveDevice
  return state.demoMode ? createDemoDeviceCached() : null
}

let demoDeviceCache: DeviceSnapshot | null = null
function createDemoDeviceCached(): DeviceSnapshot {
  demoDeviceCache ??= createDemoDevice()
  return demoDeviceCache
}

/** Data Preservation Mode: layar terkunci + (data penting atau backup belum pasti). */
export function selectDataPreservation(state: AppState): boolean {
  return state.screenLocked === 'yes' && (state.dataImportant === 'yes' || state.backupAvailable !== 'yes')
}

/** Apakah tombol "Mulai Diagnosis" dapat dipakai, dan alasannya bila tidak. */
export function selectDiagnosisAvailability(state: AppState): { enabled: boolean; reason: string | null } {
  if (state.method === 'account-recovery' || state.method === 'official-service') return { enabled: true, reason: null }
  if (state.demoMode && !state.liveDevice) return { enabled: true, reason: null }
  if (nativeService.available) return { enabled: true, reason: null }
  return {
    enabled: false,
    reason: 'Diagnosis perangkat hanya tersedia di aplikasi desktop. Aktifkan Mode Demo di Settings untuk pratinjau.',
  }
}

/** Dipakai test untuk mengembalikan store ke kondisi awal. */
export function resetAppStore(): void {
  clearTimers()
  endLiveRun()
  demoDeviceCache = null
  useAppStore.setState({ ...initialState, logs: [] })
}
