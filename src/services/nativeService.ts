import { isTauri } from '@tauri-apps/api/core'
import type { NativeResult } from '@/types/domain'
import { DESKTOP_ONLY_REASON, type NativeService } from './nativeTypes'
import { tauriNativeService } from './tauriNativeService'

export * from './nativeTypes'

const unavailable = <T>(): Promise<NativeResult<T>> =>
  Promise.resolve({ kind: 'unavailable', reason: DESKTOP_ONLY_REASON })

/** Dipakai di luar aplikasi desktop (browser dev/test): melapor `unavailable`, tanpa hasil palsu. */
export const unavailableNativeService: NativeService = {
  available: false,
  checkPlatformTools: unavailable,
  detectDevices: unavailable,
  startDiagnosis: unavailable,
  cancelDiagnosis: () => Promise.resolve(),
  checkDriverStatus: unavailable,
  openOfficialLink: unavailable,
}

export let nativeService: NativeService = isTauri() ? tauriNativeService : unavailableNativeService

/** Dipakai test untuk menyuntikkan layanan palsu secara eksplisit. */
export function setNativeServiceForTests(service: NativeService): void {
  nativeService = service
}
