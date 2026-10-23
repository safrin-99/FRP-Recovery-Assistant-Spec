/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL project Supabase (publik). */
  readonly VITE_SUPABASE_URL?: string
  /** Publishable key Supabase (publik; keamanan data dari Auth + RLS). Jangan isi secret/service_role. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
