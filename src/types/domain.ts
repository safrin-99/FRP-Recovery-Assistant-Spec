import { z } from 'zod'

/**
 * Nilai dari perangkat dianggap tidak tepercaya (PRD §11): panjang dan karakter
 * divalidasi sebelum ditampilkan/diekspor.
 */
const deviceText = z
  .string()
  .trim()
  .max(64)
  .regex(/^[\p{L}\p{N} ._\-+/()]*$/u, 'Karakter tidak valid')
  .nullable()

export const TransportSchema = z.enum(['usb', 'adb', 'fastboot', 'unknown'])
export const AuthorizationSchema = z.enum(['authorized', 'unauthorized', 'offline', 'unavailable', 'unknown'])
export const DeviceSourceSchema = z.enum(['live', 'demo'])
export const DeviceModeSchema = z.enum(['normal', 'recovery', 'sideload', 'rescue', 'bootloader'])
export type DeviceMode = z.infer<typeof DeviceModeSchema>

/** DeviceSnapshot — PRD §11. `id` adalah ID sesi internal, bukan serial mentah. */
export const DeviceSnapshotSchema = z.object({
  id: z.string().min(1).max(64),
  brand: deviceText,
  model: deviceText,
  modelCode: deviceText,
  androidVersion: deviceText,
  securityPatch: deviceText,
  transport: TransportSchema,
  authorization: AuthorizationSchema,
  mode: DeviceModeSchema.nullable().optional(),
  detectedAt: z.iso.datetime(),
  source: DeviceSourceSchema,
})
export type DeviceSnapshot = z.infer<typeof DeviceSnapshotSchema>
export type Transport = z.infer<typeof TransportSchema>
export type Authorization = z.infer<typeof AuthorizationSchema>

export const LogLevelSchema = z.enum(['info', 'success', 'warning', 'error'])
export type LogLevel = z.infer<typeof LogLevelSchema>

export const LOG_CATEGORIES = ['Perangkat', 'USB', 'ADB', 'Fastboot', 'Driver', 'Kasus', 'Sistem', 'AI'] as const
export type LogCategory = (typeof LOG_CATEGORIES)[number]

/** DiagnosticLog — PRD §11 (detailsRedacted opsional pada M1). */
export const LogEntrySchema = z.object({
  id: z.string().min(1).max(64),
  timestamp: z.iso.datetime(),
  level: LogLevelSchema,
  category: z.enum(LOG_CATEGORIES),
  message: z.string().min(1).max(500),
  detailsRedacted: z.string().max(2000).optional(),
  source: DeviceSourceSchema,
})
export type LogEntry = z.infer<typeof LogEntrySchema>

export type PageId =
  | 'home'
  | 'screen-lock'
  | 'frp-recovery'
  | 'ai-assistant'
  | 'device-info'
  | 'flash-reset'
  | 'tools'
  | 'drivers'
  | 'logs'
  | 'settings'

export type MethodId = 'adb-diagnostics' | 'fastboot-guide' | 'account-recovery' | 'official-service'

export type BrandId =
  | 'samsung'
  | 'xiaomi'
  | 'oppo'
  | 'vivo'
  | 'realme'
  | 'infinix'
  | 'tecno'
  | 'huawei'
  | 'motorola'
  | 'asus'
  | 'other'

export type DetectionStatus = 'idle' | 'detecting' | 'found' | 'none' | 'error'
export type RunStatus = 'idle' | 'running' | 'cancelled' | 'finished' | 'failed'

/** Jalur yang menjalankan perintah perangkat (backend). Jalur lain hanya membuka panduan. */
export type DeviceMethodId = Extract<MethodId, 'adb-diagnostics' | 'fastboot-guide'>
export function isDeviceMethod(method: MethodId): method is DeviceMethodId {
  return method === 'adb-diagnostics' || method === 'fastboot-guide'
}

/** Hasil layanan native. `unavailable` = backend belum ada / alat tidak dapat dijalankan. */
export type NativeResult<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'unavailable'; reason: string }
  | { kind: 'error'; message: string }

export type UserAnswer = 'unanswered' | 'yes' | 'no'
/** Status backup — nilai sama dengan `recovery_cases.backup_status` (PRD §7.2). */
export type BackupAnswer = 'not_checked' | 'available_verified' | 'partial' | 'none' | 'unknown'
