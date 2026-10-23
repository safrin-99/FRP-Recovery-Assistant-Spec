import { OFFICIAL_LINKS, type OfficialLink } from '@/data/catalog'
import type { RecoveryCase } from './model'

export interface ResetGuide {
  /** true bila panduan merek tersedia di rujukan resmi PRD §17. */
  brandSpecific: boolean
  warning: string | null
  links: OfficialLink[]
  steps: string[]
}

/**
 * Panduan reset berbasis rujukan resmi (PRD v2.3 §17). Tidak mengarang URL atau kombinasi
 * tombol per model; langkah fisik mengikuti dokumentasi produsen yang dibuka teknisi.
 */
export function resolveResetGuide(c: RecoveryCase): ResetGuide {
  const modelKnown = c.modelSource !== 'unknown' && Boolean(c.model)
  const common = [
    'Pastikan pemilik siap masuk dengan akun yang terikat setelah reset; verifikasi akun dapat diminta saat setup.',
    'Teknisi menjalankan prosedur reset langsung pada perangkat sesuai dokumentasi resmi. Aplikasi tidak menjalankan wipe, flashing, atau perintah dari komputer.',
    'Setelah perangkat menyala ulang, lanjutkan ke checklist pasca-reset di bawah.',
  ]

  if (c.brand === 'xiaomi') {
    return {
      brandSpecific: true,
      warning: modelKnown
        ? null
        : 'Model belum terverifikasi. Cocokkan langkah di panduan resmi Xiaomi dengan model perangkat sebelum melanjutkan.',
      links: [OFFICIAL_LINKS.xiaomiForgotScreenPassword, OFFICIAL_LINKS.xiaomiUnlockQa, OFFICIAL_LINKS.xiaomiAccount],
      steps: [
        'Buka panduan resmi Xiaomi "The unlock screen password is forgotten" dan "Phone Unlocking Q&As" untuk perangkat ini.',
        'Perhatikan peringatan resmi Xiaomi: Wipe Data menghapus data, dan Akun Xiaomi dapat diminta setelah reset.',
        ...common,
      ],
    }
  }

  return {
    brandSpecific: false,
    warning: `Panduan khusus merek ini belum tersedia di rujukan resmi aplikasi. Gunakan panduan resmi Android dan dokumentasi resmi produsen; bila ragu, rujuk ke layanan resmi.${
      modelKnown ? '' : ' Model juga belum terverifikasi.'
    }`,
    links: [OFFICIAL_LINKS.googleUnlockHelp, OFFICIAL_LINKS.googleAccountRecovery],
    steps: [
      'Buka panduan resmi Google "Tidak dapat membuka kunci perangkat Android" dan ikuti opsi yang sesuai.',
      ...common,
    ],
  }
}
