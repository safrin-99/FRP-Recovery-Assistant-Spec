import { z } from 'zod'
import { create } from 'zustand'

export const ThemeSchema = z.enum(['dark', 'light'])
export type Theme = z.infer<typeof ThemeSchema>
export const LanguageSchema = z.enum(['id'])
/** Provider AI default `disabled` (PRD §7.9). Provider lain belum diimplementasikan. */
export const AiProviderIdSchema = z.enum(['disabled'])

export const SettingsSchema = z.object({
  theme: ThemeSchema,
  language: LanguageSchema,
  aiProvider: AiProviderIdSchema,
  aiHistoryEnabled: z.literal(false),
})
export type Settings = z.infer<typeof SettingsSchema>

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  language: 'id',
  aiProvider: 'disabled',
  aiHistoryEnabled: false,
}

/**
 * Tema adalah preferensi tampilan per komputer, jadi disimpan di penyimpanan lokal WebView.
 * Pengaturan lain tetap per sesi sampai disinkronkan ke `app_settings` Supabase (PRD v2.4 Milestone 4/5).
 */
export const THEME_STORAGE_KEY = 'frp-recovery.theme'

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}

function readStoredTheme(): Theme {
  try {
    const parsed = ThemeSchema.safeParse(localStorage.getItem(THEME_STORAGE_KEY))
    return parsed.success ? parsed.data : DEFAULT_SETTINGS.theme
  } catch {
    return DEFAULT_SETTINGS.theme
  }
}

function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Penyimpanan tidak tersedia: tema tetap berlaku untuk sesi ini.
  }
}

interface SettingsState extends Settings {
  /** Nilai dari UI divalidasi Zod; nilai di luar skema ditolak (tidak mengubah state). */
  update: (patch: Partial<Record<keyof Settings, unknown>>) => boolean
}

const initialTheme = readStoredTheme()
applyTheme(initialTheme)

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  ...DEFAULT_SETTINGS,
  theme: initialTheme,
  update: (patch) => {
    const state = get()
    const current: Settings = {
      theme: state.theme,
      language: state.language,
      aiProvider: state.aiProvider,
      aiHistoryEnabled: state.aiHistoryEnabled,
    }
    const parsed = SettingsSchema.safeParse({ ...current, ...patch })
    if (!parsed.success) return false
    set(parsed.data)
    if (parsed.data.theme !== state.theme) {
      applyTheme(parsed.data.theme)
      storeTheme(parsed.data.theme)
    }
    return true
  },
}))

export function resetSettingsStore(): void {
  try {
    localStorage.removeItem(THEME_STORAGE_KEY)
  } catch {
    // diabaikan
  }
  applyTheme(DEFAULT_SETTINGS.theme)
  useSettingsStore.setState(DEFAULT_SETTINGS)
}
