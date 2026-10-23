import { z } from 'zod'
import { create } from 'zustand'
import { getSupabase } from '@/services/supabase/client'
import { supabaseConfig } from '@/services/supabase/config'

/**
 * Status akun & cloud (DESIGN.md §18). Hanya akun aplikasi (Supabase Auth email/password) —
 * tidak pernah akun Google/produsen perangkat. Sesi disimpan di memori saja.
 */
export type CloudStatus = 'not_configured' | 'invalid_config' | 'signed_out' | 'authenticating' | 'signed_in' | 'session_expired'

export const CredentialsSchema = z.object({
  email: z.email('Format email tidak valid').max(254),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter').max(72, 'Kata sandi maksimal 72 karakter'),
})

interface CloudState {
  status: CloudStatus
  configMessage: string | null
  email: string | null
  userId: string | null
  authError: string | null
  notice: string | null
  online: boolean
  /** Consent "Simpan ke Supabase" untuk sesi ini (dijelaskan sebelum simpan pertama). */
  saveConsentGiven: boolean

  init: () => () => void
  signIn: (email: string, password: string) => Promise<boolean>
  signUp: (email: string, password: string) => Promise<'signed_in' | 'verify_email' | 'error'>
  signOut: () => Promise<void>
  giveSaveConsent: () => void
  markSessionExpired: () => void
}

function authMessage(err: unknown): string {
  const e = (err ?? {}) as { code?: unknown; status?: unknown; message?: unknown; name?: unknown }
  const code = typeof e.code === 'string' ? e.code : ''
  if (e.name === 'AuthRetryableFetchError' || /fetch/i.test(String(e.message ?? ''))) return 'Tidak dapat menghubungi Supabase. Periksa koneksi internet.'
  if (code === 'invalid_credentials') return 'Email atau kata sandi salah.'
  if (code === 'email_not_confirmed') return 'Email belum diverifikasi. Buka tautan verifikasi di email Anda.'
  if (code === 'user_already_exists' || code === 'email_exists') return 'Email sudah terdaftar. Silakan masuk.'
  if (code === 'weak_password') return 'Kata sandi terlalu lemah.'
  if (e.status === 429 || /rate_limit/.test(code)) return 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.'
  return 'Autentikasi gagal. Coba lagi.'
}

const initialStatus: CloudStatus =
  supabaseConfig.kind === 'ok' ? 'signed_out' : supabaseConfig.kind === 'missing' ? 'not_configured' : 'invalid_config'

export const useCloudStore = create<CloudState>()((set, get) => ({
  status: initialStatus,
  configMessage: supabaseConfig.kind === 'invalid' ? supabaseConfig.reason : null,
  email: null,
  userId: null,
  authError: null,
  notice: null,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  saveConsentGiven: false,

  init: () => {
    const onOnline = () => set({ online: true })
    const onOffline = () => set({ online: false })
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    const client = getSupabase()
    const sub = client?.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        set({ status: 'signed_in', email: session.user.email ?? null, userId: session.user.id, authError: null })
      } else if (event === 'SIGNED_OUT' && get().status === 'signed_in') {
        // Keluar bukan atas permintaan pengguna (mis. refresh token gagal) → sesi berakhir.
        set({ status: 'session_expired', email: null, userId: null })
      }
    })
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      sub?.data.subscription.unsubscribe()
    }
  },

  signIn: async (email, password) => {
    const client = getSupabase()
    if (!client) return false
    set({ status: 'authenticating', authError: null, notice: null })
    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password })
      if (error || !data.user) {
        set({ status: 'signed_out', authError: authMessage(error) })
        return false
      }
      set({ status: 'signed_in', email: data.user.email ?? null, userId: data.user.id })
      return true
    } catch (err) {
      set({ status: 'signed_out', authError: authMessage(err) })
      return false
    }
  },

  signUp: async (email, password) => {
    const client = getSupabase()
    if (!client) return 'error'
    set({ status: 'authenticating', authError: null, notice: null })
    try {
      const { data, error } = await client.auth.signUp({ email, password })
      if (error) {
        set({ status: 'signed_out', authError: authMessage(error) })
        return 'error'
      }
      if (data.session?.user) {
        set({ status: 'signed_in', email: data.session.user.email ?? null, userId: data.session.user.id })
        return 'signed_in'
      }
      set({ status: 'signed_out', notice: 'Akun dibuat. Buka tautan verifikasi di email, lalu masuk.' })
      return 'verify_email'
    } catch (err) {
      set({ status: 'signed_out', authError: authMessage(err) })
      return 'error'
    }
  },

  signOut: async () => {
    const client = getSupabase()
    set({ status: 'signed_out', email: null, userId: null, saveConsentGiven: false })
    await client?.auth.signOut().catch(() => undefined)
  },

  giveSaveConsent: () => set({ saveConsentGiven: true }),
  markSessionExpired: () => set({ status: 'session_expired', email: null, userId: null }),
}))

export function resetCloudStoreForTests(status: CloudStatus = initialStatus): void {
  useCloudStore.setState({
    status,
    email: null,
    userId: null,
    authError: null,
    notice: null,
    online: true,
    saveConsentGiven: false,
  })
}
