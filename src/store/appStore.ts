import { create } from 'zustand'
import { BRAND_LABELS } from '@/data/catalog'
import { createDemoDevice, DEMO_RUN_STAGES, DEMO_STAGE_DELAY_MS } from '@/data/demo'
import { nativeService, parseDeviceSnapshot } from '@/services/nativeService'
import type {
  BackupAnswer,
  BrandId,
  DetectionStatus,
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

let logSeq = 0
let runTimer: ReturnType<typeof setTimeout> | null = null
let detectTimer: ReturnType<typeof setTimeout> | null = null

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

function brandFromText(text: string | null): BrandId | null {
  if (!text) return null
  const wanted = text.trim().toLowerCase()
  const match = (Object.entries(BRAND_LABELS) as Array<[BrandId, string]>).find(
    ([id, label]) => id !== 'other' && label.toLowerCase() === wanted,
  )
  return match ? match[0] : null
}

export interface AppState {
  page: PageId
  helpOpen: boolean
  demoMode: boolean
  /** Perangkat nyata dari backend (selalu null pada M1 karena backend belum ada). */
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

  return {
    ...initialState,

    setPage: (page) => set({ page }),
    setHelpOpen: (helpOpen) => set({ helpOpen }),

    setDemoMode: (enabled) => {
      const state = get()
      if (enabled === state.demoMode) return
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
      const demo = get().demoMode && !get().liveDevice
      const source = demo ? 'demo' : 'live'
      set({ detection: { status: 'detecting', message: 'Mendeteksi…' } })
      pushLog(makeLog('info', 'Perangkat', 'Mendeteksi perangkat…', source))

      if (demo) {
        await new Promise<void>((resolve) => {
          detectTimer = setTimeout(resolve, DEMO_DETECT_DELAY_MS)
        })
        if (!get().demoMode) return // Mode Demo dimatikan saat menunggu
        const device = createDemoDevice()
        set({ brand: 'samsung', detection: { status: 'found', message: 'Perangkat contoh ditemukan.' } })
        pushLog(makeLog('success', 'Perangkat', `Perangkat contoh ditampilkan: ${device.brand ?? ''} ${device.model ?? ''}`.trim(), 'demo'))
        return
      }

      const outcome = await nativeService.detectDevices()
      if (outcome.kind === 'unavailable') {
        set({ detection: { status: 'error', message: outcome.reason } })
        pushLog(makeLog('warning', 'Sistem', `Deteksi tidak tersedia: ${outcome.reason}`, 'live'))
      } else if (outcome.kind === 'error') {
        set({ detection: { status: 'error', message: outcome.message } })
        pushLog(makeLog('error', 'Perangkat', `Deteksi gagal: ${outcome.message}`, 'live'))
      } else if (outcome.value === null) {
        set({ detection: { status: 'none', message: 'Tidak ada perangkat.' } })
        pushLog(makeLog('info', 'Perangkat', 'Tidak ada perangkat terdeteksi.', 'live'))
      } else {
        const device = parseDeviceSnapshot(outcome.value)
        if (!device) {
          set({ detection: { status: 'error', message: 'Data perangkat dari backend tidak valid.' } })
          pushLog(makeLog('error', 'Perangkat', 'Data perangkat dari backend ditolak (validasi gagal).', 'live'))
          return
        }
        set((s) => ({
          liveDevice: device,
          demoMode: false,
          brand: brandFromText(device.brand) ?? s.brand,
          detection: { status: 'found', message: 'Perangkat ditemukan.' },
          logs: s.logs.filter((entry) => entry.source !== 'demo'),
        }))
        pushLog(makeLog('success', 'Perangkat', `Perangkat ditemukan: ${device.brand ?? '—'} ${device.model ?? ''}`.trim(), 'live'))
      }
    },

    startDiagnosis: () => {
      const state = get()
      if (state.run.status === 'running') return
      if (!(state.demoMode && !state.liveDevice)) {
        pushLog(makeLog('warning', 'Sistem', 'Diagnosis nyata belum tersedia (Milestone 2).', 'live'))
        return
      }
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
    },

    cancelDiagnosis: () => {
      if (get().run.status !== 'running') return
      if (runTimer) clearTimeout(runTimer)
      runTimer = null
      set((s) => ({ run: { status: 'cancelled', progress: s.run.progress, stage: null } }))
      pushLog(makeLog('warning', 'Sistem', 'Diagnosis dibatalkan oleh pengguna.', get().demoMode ? 'demo' : 'live'))
    },

    clearLogs: () => set({ logs: [] }),

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

/** Dipakai test untuk mengembalikan store ke kondisi awal. */
export function resetAppStore(): void {
  clearTimers()
  demoDeviceCache = null
  useAppStore.setState({ ...initialState, logs: [] })
}
