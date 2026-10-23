import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { z } from 'zod'
import type { NativeResult } from '@/types/domain'
import {
  DiagnosticEventSchema,
  DriverReportSchema,
  PlatformToolsStatusSchema,
  deviceFromDto,
  type NativeService,
} from './nativeTypes'

const CommandErrorSchema = z.object({ code: z.string().max(40), message: z.string().max(500) })

/** Galat backend → pesan untuk pengguna. Galat tak dikenal tidak diteruskan mentah. */
function toError<T>(err: unknown): NativeResult<T> {
  const parsed = CommandErrorSchema.safeParse(err)
  if (parsed.success) return { kind: 'error', message: parsed.data.message }
  return { kind: 'error', message: 'Perintah aplikasi gagal dijalankan.' }
}

async function call<T>(command: string, args: Record<string, unknown>, schema: z.ZodType<T>): Promise<NativeResult<T>> {
  try {
    const raw = await invoke<unknown>(command, args)
    const parsed = schema.safeParse(raw)
    return parsed.success
      ? { kind: 'ok', value: parsed.data }
      : { kind: 'error', message: 'Respons backend tidak valid dan diabaikan.' }
  } catch (err) {
    return toError(err)
  }
}

const DetectResultSchema = z.object({
  devices: z.array(z.unknown()).max(16),
  adbAvailable: z.boolean(),
  fastbootAvailable: z.boolean(),
})

export const DIAGNOSTIC_EVENT = 'diagnostic-event'

export const tauriNativeService: NativeService = {
  available: true,

  checkPlatformTools: () => call('check_platform_tools', {}, PlatformToolsStatusSchema),

  async detectDevices() {
    const raw = await call('detect_devices', {}, DetectResultSchema)
    if (raw.kind !== 'ok') return raw
    const devices = raw.value.devices.map(deviceFromDto)
    if (devices.some((device) => device === null)) {
      return { kind: 'error', message: 'Data perangkat dari backend tidak valid dan diabaikan.' }
    }
    return {
      kind: 'ok',
      value: {
        devices: devices.filter((device) => device !== null),
        adbAvailable: raw.value.adbAvailable,
        fastbootAvailable: raw.value.fastbootAvailable,
      },
    }
  },

  async startDiagnosis(runId, method, onEvent) {
    // Dengarkan dulu sebelum memulai agar event pertama tidak terlewat.
    const unlisten = await listen<unknown>(DIAGNOSTIC_EVENT, (event) => {
      const parsed = DiagnosticEventSchema.safeParse(event.payload)
      if (parsed.success && parsed.data.runId === runId) onEvent(parsed.data)
    })
    try {
      await invoke('start_diagnosis', { runId, method })
      return { kind: 'ok', value: unlisten }
    } catch (err) {
      unlisten()
      return toError(err)
    }
  },

  async cancelDiagnosis(runId) {
    try {
      await invoke('cancel_diagnosis', { runId })
    } catch {
      // Pembatalan bersifat best-effort; hasil akhir tetap datang lewat event.
    }
  },

  checkDriverStatus: () => call('check_driver_status', {}, DriverReportSchema),

  async openOfficialLink(id) {
    const result = await call('open_official_link', { link: id }, z.null())
    return result.kind === 'ok' ? { kind: 'ok', value: undefined } : result
  },
}
