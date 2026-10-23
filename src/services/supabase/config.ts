/**
 * Validasi konfigurasi Supabase saat startup (SUPABASE_SETUP.md §2). URL dan publishable key
 * bersifat publik; aplikasi menolak secret/service_role key agar tidak pernah ikut terbundel.
 */
export type SupabaseConfig =
  | { kind: 'ok'; url: string; key: string }
  | { kind: 'missing' }
  | { kind: 'invalid'; reason: string }

function jwtRole(token: string): string | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const payload = JSON.parse(atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/'))) as { role?: unknown }
    return typeof payload.role === 'string' ? payload.role : null
  } catch {
    return null
  }
}

export function parseSupabaseConfig(env: { url?: string; key?: string }): SupabaseConfig {
  const url = env.url?.trim() ?? ''
  const key = env.key?.trim() ?? ''
  if (!url || !key) return { kind: 'missing' }
  // Nilai contoh dari .env.example dianggap belum dikonfigurasi.
  if (url.includes('YOUR_PROJECT_REF') || key.includes('REPLACE_WITH')) return { kind: 'missing' }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { kind: 'invalid', reason: 'VITE_SUPABASE_URL bukan URL yang valid.' }
  }
  if (parsed.protocol !== 'https:') return { kind: 'invalid', reason: 'VITE_SUPABASE_URL harus memakai https.' }

  if (key.startsWith('sb_secret_') || jwtRole(key) === 'service_role') {
    return {
      kind: 'invalid',
      reason: 'Key yang diisi adalah secret/service_role. Gunakan publishable key; secret tidak boleh ada di aplikasi.',
    }
  }
  const looksPublishable = key.startsWith('sb_publishable_') || jwtRole(key) === 'anon'
  if (!looksPublishable) return { kind: 'invalid', reason: 'VITE_SUPABASE_PUBLISHABLE_KEY bukan publishable key Supabase.' }

  return { kind: 'ok', url: parsed.origin, key }
}

export const supabaseConfig: SupabaseConfig = parseSupabaseConfig({
  url: import.meta.env.VITE_SUPABASE_URL,
  key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
})
