import { create } from 'zustand'
import { getSupabase } from '@/services/supabase/client'
import { cloudError } from '@/services/supabase/errors'
import {
  deleteRecoveryCase,
  listRecoveryCases,
  saveRecoveryCase,
  type CloudCase,
} from '@/services/supabase/recoveryCasesRepo'
import { useAppStore } from '@/store/appStore'
import { useCloudStore } from '@/store/cloudStore'
import type { BrandId, DeviceSnapshot } from '@/types/domain'
import {
  allowedOutcomes,
  canRequestConsent,
  createCase,
  declineResetConsent,
  grantResetConsent,
  revokeResetConsent,
  setOutcome,
} from './engine'
import { CONSENT_LABELS, OUTCOME_LABELS, type Outcome, type PostResetChecklist, type PreservationChecklist, type RecoveryCase } from './model'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed'

interface ScreenLockState {
  current: RecoveryCase | null
  save: { status: SaveStatus; savedAt: string | null; error: string | null; dirty: boolean }
  history: { status: 'idle' | 'loading' | 'loaded' | 'error'; items: CloudCase[]; error: string | null }

  startCase: (brand: BrandId, device: DeviceSnapshot | null) => void
  update: (patch: Partial<Omit<RecoveryCase, 'id' | 'ticketCode' | 'createdAt'>>) => void
  updatePreservation: (patch: Partial<PreservationChecklist>) => void
  updatePostReset: (patch: Partial<PostResetChecklist>) => void
  grantConsent: () => void
  declineConsent: () => void
  chooseOutcome: (outcome: Outcome) => void
  saveToCloud: () => Promise<boolean>
  loadHistory: () => Promise<void>
  deleteFromCloud: (id: string) => Promise<boolean>
}

const log = (level: 'info' | 'success' | 'warning' | 'error', message: string) =>
  useAppStore.getState().addLog(level, 'Kasus', message)

const initialSave = { status: 'idle' as SaveStatus, savedAt: null, error: null, dirty: false }

/** Field yang menjadi dasar consent reset; mengubahnya membatalkan consent yang tercatat. */
const CONSENT_BASIS: Array<keyof RecoveryCase> = [
  'brand',
  'model',
  'issueType',
  'dataPreference',
  'ownerAuthorizationConfirmed',
  'accountReadiness',
  'dataLossExplained',
  'accountVerificationExplained',
]

export const useScreenLockStore = create<ScreenLockState>()((set, get) => {
  const change = (proposed: RecoveryCase) => {
    // Hasil yang buktinya hilang (mis. checklist pasca-reset dibatalkan) kembali ke "Belum diverifikasi".
    const next: RecoveryCase = allowedOutcomes(proposed).includes(proposed.outcome) ? proposed : { ...proposed, outcome: 'not_verified' }
    set((s) => ({ current: next, save: { ...s.save, dirty: true, status: s.save.status === 'saving' ? 'saving' : 'idle' } }))
  }

  return {
    current: null,
    save: initialSave,
    history: { status: 'idle', items: [], error: null },

    startCase: (brand, device) => {
      const c = createCase(new Date(), brand, device)
      set({ current: c, save: initialSave })
      log('info', `Tiket ${c.ticketCode} dibuat (Screen Lock Recovery).`)
    },

    update: (patch) => {
      const c = get().current
      if (!c) return
      let next: RecoveryCase = { ...c, ...patch }
      if (patch.ownerAuthorizationConfirmed !== undefined) {
        next.ownerAuthorizedAt = patch.ownerAuthorizationConfirmed ? new Date().toISOString() : null
      }
      const basisChanged = CONSENT_BASIS.some((key) => key in patch && patch[key as keyof typeof patch] !== c[key])
      if (c.resetConsentStatus === 'accepted' && basisChanged) {
        next = revokeResetConsent(next)
        log('warning', `Consent reset ${c.ticketCode} dibatalkan karena data tiket berubah. Minta persetujuan baru bila perlu.`)
      }
      change(next)
    },

    updatePreservation: (patch) => {
      const c = get().current
      if (c) change({ ...c, preservation: { ...c.preservation, ...patch } })
    },

    updatePostReset: (patch) => {
      const c = get().current
      if (c) change({ ...c, postReset: { ...c.postReset, ...patch } })
    },

    grantConsent: () => {
      const c = get().current
      if (!c || !canRequestConsent(c)) return
      change(grantResetConsent(c, new Date()))
      log(
        'warning',
        `Consent reset ${c.ticketCode}: ${CONSENT_LABELS.accepted}. Panduan reset resmi dibuka; tidak ada perintah dikirim ke perangkat.`,
      )
    },

    declineConsent: () => {
      const c = get().current
      if (!c) return
      change(declineResetConsent(c, new Date()))
      log('info', `Consent reset ${c.ticketCode}: ${CONSENT_LABELS.declined}. Tiket memakai jalur Data Preservation.`)
    },

    chooseOutcome: (outcome) => {
      const c = get().current
      if (!c || !allowedOutcomes(c).includes(outcome)) return
      change(setOutcome(c, outcome))
      log(outcome === 'failed' ? 'warning' : 'info', `Hasil ${c.ticketCode}: ${OUTCOME_LABELS[outcome]}.`)
    },

    saveToCloud: async () => {
      const c = get().current
      const client = getSupabase()
      const cloud = useCloudStore.getState()
      if (!c) return false
      if (!client) {
        set((s) => ({ save: { ...s.save, status: 'failed', error: cloudError('not_configured').message } }))
        return false
      }
      if (cloud.status !== 'signed_in' || !cloud.userId) {
        set((s) => ({ save: { ...s.save, status: 'failed', error: 'Masuk dulu untuk menyimpan ke cloud.' } }))
        return false
      }
      if (c.issueType === null) {
        set((s) => ({ save: { ...s.save, status: 'failed', error: 'Pilih tipe masalah sebelum menyimpan.' } }))
        return false
      }
      set((s) => ({ save: { ...s.save, status: 'saving', error: null } }))
      const result = await saveRecoveryCase(client, c, cloud.userId)
      if (!result.ok) {
        if (result.error.kind === 'session_expired') useCloudStore.getState().markSessionExpired()
        set((s) => ({ save: { ...s.save, status: 'failed', error: result.error.message } }))
        log('error', `Tiket ${c.ticketCode} belum tersimpan ke cloud: ${result.error.message}`)
        return false
      }
      // Hanya tandai tersimpan bila kasus tidak berubah selama request berjalan.
      const unchanged = get().current === c
      set({ save: { status: 'saved', savedAt: result.value.updatedAt, error: null, dirty: !unchanged } })
      log('success', `Tiket ${c.ticketCode} tersimpan ke Supabase.`)
      return true
    },

    loadHistory: async () => {
      const client = getSupabase()
      if (!client || useCloudStore.getState().status !== 'signed_in') return
      set((s) => ({ history: { ...s.history, status: 'loading', error: null } }))
      const result = await listRecoveryCases(client)
      if (result.ok) set({ history: { status: 'loaded', items: result.value, error: null } })
      else {
        if (result.error.kind === 'session_expired') useCloudStore.getState().markSessionExpired()
        set((s) => ({ history: { ...s.history, status: 'error', error: result.error.message } }))
      }
    },

    deleteFromCloud: async (id) => {
      const client = getSupabase()
      if (!client) return false
      const result = await deleteRecoveryCase(client, id)
      if (!result.ok) {
        set((s) => ({ history: { ...s.history, error: result.error.message } }))
        log('error', `Gagal menghapus tiket dari cloud: ${result.error.message}`)
        return false
      }
      log('info', 'Tiket dihapus dari Supabase.')
      // Kasus di layar tetap ada tetapi tidak lagi tersimpan di cloud.
      if (get().current?.id === id) set({ save: { ...initialSave, dirty: true } })
      await get().loadHistory()
      return true
    },
  }
})

export function resetScreenLockStore(): void {
  useScreenLockStore.setState({ current: null, save: initialSave, history: { status: 'idle', items: [], error: null } })
}
