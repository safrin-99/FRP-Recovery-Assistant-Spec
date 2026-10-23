import type { OfficialLink } from '@/data/catalog'
import { nativeService } from '@/services/nativeService'

/** Hanya https:// yang diizinkan untuk tautan eksternal. */
export function isSafeExternalUrl(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
}

export function openExternal(url: string): void {
  if (!isSafeExternalUrl(url)) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

/**
 * Buka tautan resmi. Di aplikasi desktop hanya ID yang dikirim ke backend
 * (`open_official_link`), yang membuka URL dari daftarnya sendiri di browser default.
 */
export async function openOfficialLink(link: OfficialLink): Promise<boolean> {
  if (nativeService.available) {
    const result = await nativeService.openOfficialLink(link.id)
    return result.kind === 'ok'
  }
  openExternal(link.url)
  return true
}
