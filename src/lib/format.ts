const timeFormatter = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

/** Waktu lokal HH:mm:ss (PRD §7.8: waktu lokal pada log). */
export function formatLogTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '--:--:--'
  // id-ID memakai titik sebagai pemisah ("10.24.12"); pakai titik dua agar konsisten dengan referensi.
  return timeFormatter.format(date).replaceAll('.', ':')
}

/** Nilai yang belum diketahui ditampilkan sebagai "—" (PRD §7.4). */
export function orUnknown(value: string | null | undefined): string {
  return value && value.length > 0 ? value : '—'
}
