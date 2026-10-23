import { DeviceSnapshotSchema, type DeviceSnapshot } from '@/types/domain'

/**
 * DATA DEMO — hanya untuk pratinjau UI (PRD §8). Selalu source: 'demo' dan hanya
 * dipakai bila badge DEMO tampil dan tidak ada perangkat live. Bukan hasil deteksi.
 */
export function createDemoDevice(): DeviceSnapshot {
  return DeviceSnapshotSchema.parse({
    id: 'demo-session',
    brand: 'Samsung',
    model: 'Galaxy A12',
    modelCode: 'SM-A125F',
    androidVersion: '11',
    securityPatch: '2022-03-01',
    transport: 'adb',
    authorization: 'authorized',
    detectedAt: new Date().toISOString(),
    source: 'demo',
  })
}

/** Tahapan simulasi diagnosis demo. Tidak ada perintah yang dikirim ke perangkat mana pun. */
export const DEMO_RUN_STAGES = [
  'Menyiapkan sesi diagnosis contoh…',
  'Memeriksa koneksi USB (contoh)…',
  'Memeriksa otorisasi ADB (contoh)…',
  'Membaca info perangkat contoh…',
  'Menyusun ringkasan diagnosis contoh…',
] as const

export const DEMO_STAGE_DELAY_MS = 700
