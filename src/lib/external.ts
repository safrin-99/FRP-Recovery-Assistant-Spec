/**
 * Satu-satunya jalur membuka tautan eksternal. Hanya https:// yang diizinkan.
 * Milestone 2 akan mengganti isi fungsi ini dengan perintah backend allowlist
 * (`open_official_recovery_guide`) sehingga frontend tidak membuka URL arbitrer.
 */
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
