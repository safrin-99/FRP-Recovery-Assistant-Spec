import { DeviceSnapshotSchema, type DeviceSnapshot, type NativeResult } from '@/types/domain'

/**
 * Lapisan layanan native (Rust via Tauri IPC). Pada Milestone 1 backend belum ada,
 * sehingga semua fungsi melapor `unavailable` secara jujur — tidak ada hasil palsu.
 * Milestone 2 menggantikan implementasi dengan perintah Tauri yang spesifik dan
 * allowlisted (`detect_devices`, dst.), bukan runner perintah generik.
 */
export type DetectOutcome = NativeResult<DeviceSnapshot | null>

export interface NativeService {
  detectDevices(signal?: AbortSignal): Promise<DetectOutcome>
  checkPlatformTools(): Promise<NativeResult<{ adb: string | null; fastboot: string | null }>>
  checkDriverStatus(): Promise<NativeResult<{ summary: string }>>
}

const BACKEND_PENDING = 'Backend native (Rust/Tauri) belum diimplementasikan — dijadwalkan pada Milestone 2.'

export const unavailableNativeService: NativeService = {
  detectDevices: () => Promise.resolve({ kind: 'unavailable', reason: BACKEND_PENDING }),
  checkPlatformTools: () => Promise.resolve({ kind: 'unavailable', reason: BACKEND_PENDING }),
  checkDriverStatus: () => Promise.resolve({ kind: 'unavailable', reason: BACKEND_PENDING }),
}

/** Validasi data mentah dari backend sebelum masuk store (data perangkat tidak tepercaya). */
export function parseDeviceSnapshot(raw: unknown): DeviceSnapshot | null {
  const result = DeviceSnapshotSchema.safeParse(raw)
  return result.success ? result.data : null
}

export let nativeService: NativeService = unavailableNativeService

/** Dipakai test untuk menyuntikkan layanan palsu secara eksplisit. */
export function setNativeServiceForTests(service: NativeService): void {
  nativeService = service
}
