/** Galat cloud yang ditampilkan ke pengguna; pesan mentah server tidak diteruskan apa adanya. */
export type CloudErrorKind = 'offline' | 'session_expired' | 'permission' | 'invalid' | 'rate_limited' | 'not_configured' | 'unknown'

export interface CloudError {
  kind: CloudErrorKind
  message: string
}

export type CloudResult<T> = { ok: true; value: T } | { ok: false; error: CloudError }

const MESSAGES: Record<CloudErrorKind, string> = {
  offline: 'Tidak dapat menghubungi Supabase. Periksa koneksi internet; data belum tersimpan ke cloud.',
  session_expired: 'Sesi berakhir. Masuk lagi untuk menyimpan ke cloud.',
  permission: 'Akses ditolak oleh kebijakan keamanan database (RLS).',
  invalid: 'Data ditolak oleh aturan database. Periksa kembali isian kasus.',
  rate_limited: 'Terlalu banyak permintaan. Coba lagi beberapa saat lagi.',
  not_configured: 'Supabase belum dikonfigurasi.',
  unknown: 'Operasi cloud gagal. Coba lagi.',
}

export function cloudError(kind: CloudErrorKind): CloudError {
  return { kind, message: MESSAGES[kind] }
}

/** Petakan galat supabase-js (PostgREST/Auth/fetch) ke kategori yang dapat ditindaklanjuti. */
export function toCloudError(err: unknown): CloudError {
  const e = (err ?? {}) as { code?: unknown; status?: unknown; message?: unknown; name?: unknown }
  const code = typeof e.code === 'string' ? e.code : ''
  const status = typeof e.status === 'number' ? e.status : 0
  const message = typeof e.message === 'string' ? e.message : ''

  if (e.name === 'AuthRetryableFetchError' || /Failed to fetch|NetworkError|fetch failed/i.test(message)) return cloudError('offline')
  if (status === 429 || code === 'over_request_rate_limit') return cloudError('rate_limited')
  if (code === 'PGRST301' || code === 'PGRST303' || /JWT expired/i.test(message) || status === 401) return cloudError('session_expired')
  if (code === '42501') return cloudError('permission')
  if (code === '23514' || code === '23503' || code === '23505' || code === '22P02' || code === '23502') return cloudError('invalid')
  return cloudError('unknown')
}
