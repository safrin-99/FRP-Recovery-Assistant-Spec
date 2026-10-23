import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { supabaseConfig } from './config'

let client: SupabaseClient | null = null

/**
 * Satu client Supabase untuk seluruh aplikasi (dipakai hanya lewat repository/service).
 * Sesi disimpan di memori saja (`persistSession: false`): penyimpanan aman OS untuk token
 * desktop belum diimplementasikan/diuji, sehingga pengguna perlu masuk ulang setiap membuka
 * aplikasi (SUPABASE_SETUP.md §6).
 */
export function getSupabase(): SupabaseClient | null {
  if (client) return client
  if (supabaseConfig.kind !== 'ok') return null
  client = createClient(supabaseConfig.url, supabaseConfig.key, {
    auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false },
  })
  return client
}

/** Dipakai test untuk menyuntikkan client palsu. */
export function setSupabaseForTests(fake: SupabaseClient | null): void {
  client = fake
}
