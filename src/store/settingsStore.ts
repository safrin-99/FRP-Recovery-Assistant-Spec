import { z } from 'zod'
import { create } from 'zustand'

export const ThemeSchema = z.enum(['dark'])
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

interface SettingsState extends Settings {
  /** Nilai dari UI divalidasi Zod; nilai di luar skema ditolak (tidak mengubah state). */
  update: (patch: Partial<Record<keyof Settings, unknown>>) => boolean
}

/** Pengaturan sesi saja pada Milestone 1 — persistensi SQLite dijadwalkan Milestone 3. */
export const useSettingsStore = create<SettingsState>()((set, get) => ({
  ...DEFAULT_SETTINGS,
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
    return true
  },
}))

export function resetSettingsStore(): void {
  useSettingsStore.setState(DEFAULT_SETTINGS)
}
