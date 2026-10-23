import { z } from 'zod'
import type { OfficialLinkId } from '@/data/catalog'
import {
  DeviceSnapshotSchema,
  LOG_CATEGORIES,
  LogLevelSchema,
  type DeviceMethodId,
  type DeviceSnapshot,
  type NativeResult,
} from '@/types/domain'

/**
 * Kontrak layanan native (Rust via Tauri IPC). Semua respons divalidasi Zod sebelum dipakai
 * UI (PRD §6); backend tetap dianggap sumber data tidak tepercaya untuk teks perangkat.
 */

export const ToolInfoSchema = z.object({ path: z.string().max(400), version: z.string().max(80) })
export const PlatformToolsStatusSchema = z.object({
  adb: ToolInfoSchema.nullable(),
  fastboot: ToolInfoSchema.nullable(),
})
export type PlatformToolsStatus = z.infer<typeof PlatformToolsStatusSchema>

/** DTO perangkat dari Rust: `detectedAtMs` diubah menjadi ISO untuk `DeviceSnapshot`. */
export const DeviceDtoSchema = DeviceSnapshotSchema.omit({ detectedAt: true }).extend({
  detectedAtMs: z.number().int().nonnegative(),
  source: z.literal('live'),
})

export function deviceFromDto(raw: unknown): DeviceSnapshot | null {
  const parsed = DeviceDtoSchema.safeParse(raw)
  if (!parsed.success) return null
  const { detectedAtMs, ...rest } = parsed.data
  const snapshot = DeviceSnapshotSchema.safeParse({ ...rest, detectedAt: new Date(detectedAtMs).toISOString() })
  return snapshot.success ? snapshot.data : null
}

/** Validasi data mentah perangkat sebelum masuk store (data perangkat tidak tepercaya). */
export function parseDeviceSnapshot(raw: unknown): DeviceSnapshot | null {
  const result = DeviceSnapshotSchema.safeParse(raw)
  return result.success ? result.data : null
}

export interface DetectedDevices {
  devices: DeviceSnapshot[]
  adbAvailable: boolean
  fastbootAvailable: boolean
}

export const DriverEntrySchema = z.object({
  name: z.string().max(80),
  interface: z.enum(['adb', 'fastboot', 'android-usb']),
  vendorGuess: z.string().max(40).nullable(),
  status: z.enum(['ok', 'problem', 'disabled', 'unknown']),
  problemCode: z.number().int().nullable(),
})
export const DriverReportSchema = z.object({
  entries: z.array(DriverEntrySchema).max(200),
  level: z.enum(['ok', 'warning', 'info']),
  summary: z.string().max(400),
})
export type DriverEntry = z.infer<typeof DriverEntrySchema>
export type DriverReport = z.infer<typeof DriverReportSchema>

const runIdSchema = z.number().int().nonnegative()
export const DiagnosticEventSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('stage'),
    runId: runIdSchema,
    index: z.number().int(),
    count: z.number().int(),
    label: z.string().max(120),
  }),
  z.object({ kind: z.literal('progress'), runId: runIdSchema, percent: z.number().int().min(0).max(100) }),
  z.object({
    kind: z.literal('log'),
    runId: runIdSchema,
    level: LogLevelSchema,
    category: z.enum(LOG_CATEGORIES),
    message: z.string().min(1).max(500),
  }),
  z.object({ kind: z.literal('device'), runId: runIdSchema, device: z.unknown() }),
  z.object({
    kind: z.literal('finished'),
    runId: runIdSchema,
    outcome: z.enum(['ok', 'warning', 'error']),
    summary: z.string().max(500),
  }),
  z.object({ kind: z.literal('cancelled'), runId: runIdSchema }),
  z.object({ kind: z.literal('failed'), runId: runIdSchema, message: z.string().max(500) }),
])
export type DiagnosticEvent = z.infer<typeof DiagnosticEventSchema>

export interface NativeService {
  /** `true` hanya di aplikasi desktop (backend Rust tersedia). */
  readonly available: boolean
  checkPlatformTools(): Promise<NativeResult<PlatformToolsStatus>>
  detectDevices(): Promise<NativeResult<DetectedDevices>>
  /** Mulai diagnosis; `onEvent` menerima event tervalidasi milik `runId`. Hasil: fungsi berhenti mendengar. */
  startDiagnosis(
    runId: number,
    method: DeviceMethodId,
    onEvent: (event: DiagnosticEvent) => void,
  ): Promise<NativeResult<() => void>>
  cancelDiagnosis(runId: number): Promise<void>
  checkDriverStatus(): Promise<NativeResult<DriverReport>>
  openOfficialLink(id: OfficialLinkId): Promise<NativeResult<void>>
}

export const DESKTOP_ONLY_REASON = 'Fitur perangkat hanya tersedia di aplikasi desktop (Tauri).'
