import type { DeviceSnapshot } from '@/types/domain'
import type { DeviceEvidence, RecoveryCase } from './model'

/**
 * Capability matrix Screen Lock Recovery (TASK-02 §2, §7). Menyatakan secara jujur apa yang
 * BENAR-BENAR dapat dilakukan aplikasi per mode koneksi, dan apa yang hanya berupa panduan.
 *
 * Fakta yang dikunci aturan proyek (CLAUDE.md v2.4 "Batasan tindakan perangkat"):
 * - Tidak ada operasi factory reset/wipe/flash/unlock yang dijalankan dari komputer pada MVP.
 * - ADB memerlukan otorisasi USB debugging yang tidak mungkin diberikan di layar terkunci.
 * - Fastboot erase/-w/unlock bersifat destruktif, dibatasi OEM, dan melemahkan proteksi FRP.
 * Konsekuensinya: eksekusi reset SELALU `guidance_on_device` — dilakukan teknisi langsung di
 * perangkat sesuai dokumentasi resmi. Nilai `app_executed` sengaja tidak ada.
 */
export type ResetExecution = 'guidance_on_device' | 'not_applicable'

export interface Capability {
  /** Aplikasi dapat mendeteksi perangkat pada mode ini lewat ADB/Fastboot (operasi nyata). */
  canDetect: boolean
  /** Aplikasi dapat membaca status (versi/mode/properti) pada mode ini (operasi nyata). */
  canReadStatus: boolean
  /** Bagaimana reset dijalankan. Tidak pernah dijalankan aplikasi dari komputer. */
  resetExecution: ResetExecution
  /** Penjelasan singkat untuk ditampilkan ke teknisi. */
  note: string
  /** Cara memverifikasi hasil (bukan sekadar "perintah terkirim"). */
  verifyBy: string
}

/** Ambil bukti perangkat hanya dari hasil deteksi nyata; demo tidak pernah dihitung. */
export function deviceEvidenceFrom(device: DeviceSnapshot | null): DeviceEvidence | null {
  if (!device || device.source !== 'live') return null
  return {
    sessionId: device.id,
    transport: device.transport,
    authorization: device.authorization,
    mode: device.mode ?? null,
    modelCode: device.modelCode ?? device.model ?? null,
    detectedAt: device.detectedAt,
  }
}

/** Identitas perangkat terverifikasi bila tiket memuat bukti deteksi nyata. */
export function identityVerified(c: RecoveryCase): boolean {
  return c.deviceEvidence !== null
}

const GUIDANCE_NOTE =
  'Reset dijalankan teknisi langsung pada perangkat mengikuti panduan resmi; aplikasi tidak mengirim perintah wipe/flash/unlock dari komputer.'
const VERIFY_BY =
  'Verifikasi hanya dari bukti nyata: perangkat melewati setup/aktivasi dan dapat diakses pemilik. Perintah terkirim bukan bukti keberhasilan.'

/**
 * Kapabilitas untuk tiket ini berdasarkan mode koneksi yang tercatat. Untuk keluhan kunci layar,
 * eksekusi reset selalu panduan di perangkat; masalah non-kunci-layar tidak memakai jalur reset.
 */
export function resolveCapability(c: RecoveryCase): Capability {
  const mode = c.deviceEvidence?.mode ?? null
  const detected = identityVerified(c)
  const resetExecution: ResetExecution = c.issueType === 'screen_pin_pattern' ? 'guidance_on_device' : 'not_applicable'

  let note = GUIDANCE_NOTE
  if (mode === 'bootloader') {
    note = `Perangkat di mode Fastboot. ${GUIDANCE_NOTE} Aplikasi tidak menjalankan \`fastboot erase\`/\`-w\`/unlock.`
  } else if (mode === 'recovery' || mode === 'sideload' || mode === 'rescue') {
    note = `Perangkat di mode recovery/sideload. ${GUIDANCE_NOTE}`
  } else if (!detected) {
    note = `Perangkat belum terdeteksi (umum pada layar terkunci total). ${GUIDANCE_NOTE}`
  }

  return {
    canDetect: detected,
    canReadStatus: detected && c.deviceEvidence?.authorization === 'authorized',
    resetExecution,
    note,
    verifyBy: VERIFY_BY,
  }
}
