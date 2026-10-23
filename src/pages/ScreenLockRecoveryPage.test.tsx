import type { SupabaseClient } from '@supabase/supabase-js'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { RecoveryCase } from '@/features/screenLock/model'
import { useScreenLockStore } from '@/features/screenLock/store'
import { setSupabaseForTests } from '@/services/supabase/client'
import { useAppStore } from '@/store/appStore'
import { useCloudStore } from '@/store/cloudStore'
import { ScreenLockRecoveryPage } from './ScreenLockRecoveryPage'

function expectNoVisibleNativeDropdown() {
  const natives = [...document.querySelectorAll('select, datalist')].filter((el) => el.getAttribute('aria-hidden') !== 'true')
  expect(natives).toHaveLength(0)
}

async function chooseOption(user: UserEvent, label: string, option: string) {
  const trigger = screen.getByRole('combobox', { name: label })
  trigger.focus()
  await user.keyboard('{Enter}')
  const listbox = await screen.findByRole('listbox')
  await user.click(within(listbox).getByRole('option', { name: option }))
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
}

async function startTicket(user: UserEvent) {
  render(<ScreenLockRecoveryPage />)
  await user.click(screen.getByRole('button', { name: 'Mulai tiket baru' }))
  return useScreenLockStore.getState().current!
}

/** Tiket kunci layar dengan izin pemilik; preferensi data diatur per tes. */
function prepare(overrides: Partial<RecoveryCase> = {}) {
  const c = useScreenLockStore.getState().current!
  useScreenLockStore.setState({
    current: {
      ...c,
      issueType: 'screen_pin_pattern',
      accessState: 'locked_screen',
      ownerAuthorizationConfirmed: true,
      ownerAuthorizedAt: new Date().toISOString(),
      ...overrides,
    },
  })
}

const READY_FOR_CONSENT: Partial<RecoveryCase> = {
  dataPreference: 'not_important',
  accountReadiness: 'google_ready',
  dataLossExplained: true,
  accountVerificationExplained: true,
}

const resetHeading = () => screen.getByRole('heading', { name: /Jalur A — Guided Factory Reset/ })
const preserveHeading = () => screen.getByRole('heading', { name: /Jalur B — Data Preservation/ })
const isBefore = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

describe('ScreenLockRecoveryPage', () => {
  it('starts a ticket without assuming any customer choice', async () => {
    const user = userEvent.setup()
    const c = await startTicket(user)
    expect(c.ticketCode).toMatch(/^SLR-\d{8}-[A-Z0-9]{4}$/)
    expect(screen.getByText(c.ticketCode)).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Preferensi data pelanggan' })).toHaveTextContent('Tanyakan ke pelanggan…')
    expect(screen.getByText('Tanyakan keputusan pelanggan')).toBeInTheDocument()
    expect(screen.getByText('Preferensi data pelanggan untuk tiket ini belum dipilih.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Minta persetujuan reset' })).not.toBeInTheDocument()
    expect(isBefore(preserveHeading(), resetHeading())).toBe(true)
  })

  it('uses only custom dropdowns on the page', async () => {
    const user = userEvent.setup()
    await startTicket(user)
    const comboboxes = screen.getAllByRole('combobox')
    expect(comboboxes.length).toBeGreaterThanOrEqual(7)
    for (const box of comboboxes) expect(box.tagName).toBe('BUTTON')
    expectNoVisibleNativeDropdown()

    await chooseOption(user, 'Tipe masalah', 'Lupa PIN/pola/sandi layar')
    expect(useScreenLockStore.getState().current?.issueType).toBe('screen_pin_pattern')
    expectNoVisibleNativeDropdown()
  })

  it('makes Guided Factory Reset the primary path once the customer explicitly approves data erasure', async () => {
    const user = userEvent.setup()
    await startTicket(user)
    prepare()
    await chooseOption(user, 'Preferensi data pelanggan', 'Setuju hapus data')

    expect(isBefore(resetHeading(), preserveHeading())).toBe(true)
    const reset = screen.getByRole('region', { name: /Jalur A/ })
    expect(within(reset).getByText('Reset Resmi — Menghapus Data')).toBeInTheDocument()
    expect(within(reset).getByText('Jalur utama tiket ini')).toBeInTheDocument()
    expect(within(reset).getByRole('button', { name: 'Minta persetujuan reset' })).toBeDisabled()
  })

  it('keeps reset inactive and shows the preservation banner when data must be preserved', async () => {
    const user = userEvent.setup()
    await startTicket(user)
    prepare()
    await chooseOption(user, 'Preferensi data pelanggan', 'Data harus dipertahankan')

    expect(isBefore(preserveHeading(), resetHeading())).toBe(true)
    expect(
      screen.getByText('Data harus dipertahankan — jangan reset, wipe, flash, atau unlock bootloader sebelum keputusan pelanggan selesai.'),
    ).toBeInTheDocument()
    const blockers = screen.getByRole('list', { name: 'Alasan reset terkunci' })
    expect(within(blockers).getByText(/Pelanggan memilih data harus dipertahankan/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Minta persetujuan reset' })).not.toBeInTheDocument()
  })

  it('needs the account question and both explanations before consent can be requested', async () => {
    const user = userEvent.setup()
    await startTicket(user)
    prepare({ dataPreference: 'not_important' })
    const request = await screen.findByRole('button', { name: 'Minta persetujuan reset' })
    expect(request).toBeDisabled()

    await chooseOption(user, 'Kesiapan akun pasca-reset', 'Tidak diketahui')
    expect(screen.getByText('Perangkat mungkin meminta verifikasi akun setelah reset')).toBeInTheDocument()
    expect(request).toBeDisabled()
    await user.click(screen.getByRole('switch', { name: 'Pelanggan memahami data lokal akan dihapus' }))
    expect(request).toBeDisabled()
    await user.click(screen.getByRole('switch', { name: 'Pelanggan memahami verifikasi akun dapat tetap diminta' }))
    expect(request).toBeEnabled()
  })

  it('never records an approved reset when the customer declines', async () => {
    const user = userEvent.setup()
    await startTicket(user)
    prepare(READY_FOR_CONSENT)
    await user.click(await screen.findByRole('button', { name: 'Minta persetujuan reset' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText('menghapus seluruh data lokal')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Pelanggan tidak setuju' }))
    expect(useScreenLockStore.getState().current?.resetConsentStatus).toBe('declined')
    expect(screen.getByText('Pelanggan tidak setuju')).toBeInTheDocument()
    expect(screen.queryByText(/^Panduan resmi (Xiaomi|Android)$/)).not.toBeInTheDocument()
  })

  it('opens the official brand guide only after explicit consent for this ticket', async () => {
    const user = userEvent.setup()
    useAppStore.setState({ brand: 'xiaomi' })
    await startTicket(user)
    prepare(READY_FOR_CONSENT)
    await user.click(await screen.findByRole('button', { name: 'Minta persetujuan reset' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Saya menyetujui panduan reset' }))

    const c = useScreenLockStore.getState().current!
    expect(c).toMatchObject({ resetConsentStatus: 'accepted', consentTextVersion: 'slr-reset-consent-2026-10-24' })
    const reset = screen.getByRole('region', { name: /Jalur A/ })
    expect(within(reset).getByText('Panduan resmi Xiaomi')).toBeInTheDocument()
    expect(within(reset).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      'https://www.mi.com/global/support/faq/details/KA-492633/',
      'https://www.mi.com/global/support/faq/details/KA-07085/',
      'https://account.xiaomi.com',
    ])
    // Model belum diketahui → peringatan, bukan langkah spesifik yang ditebak.
    expect(within(reset).getByText('Model belum terverifikasi')).toBeInTheDocument()
    // Tidak ada tombol aksi destruktif ke perangkat.
    expect(screen.queryByRole('button', { name: /wipe|flash|unlock|erase|bypass/i })).not.toBeInTheDocument()
  })

  it('revokes consent when the customer changes the decision, and never carries it to a new ticket', async () => {
    const user = userEvent.setup()
    await startTicket(user)
    prepare(READY_FOR_CONSENT)
    useScreenLockStore.getState().grantConsent()
    expect(useScreenLockStore.getState().current?.resetConsentStatus).toBe('accepted')

    await chooseOption(user, 'Preferensi data pelanggan', 'Belum memutuskan')
    expect(useScreenLockStore.getState().current).toMatchObject({ resetConsentStatus: 'not_requested', consentTextVersion: null })

    prepare(READY_FOR_CONSENT)
    useScreenLockStore.getState().grantConsent()
    useScreenLockStore.setState((s) => ({ save: { ...s.save, dirty: false } }))
    await user.click(screen.getByRole('button', { name: 'Tiket baru' }))
    expect(useScreenLockStore.getState().current).toMatchObject({
      dataPreference: null,
      resetConsentStatus: 'not_requested',
      accountReadiness: null,
    })
  })

  it('allows "Berhasil diverifikasi" only after the post-reset checklist is complete', async () => {
    const user = userEvent.setup()
    await startTicket(user)
    prepare(READY_FOR_CONSENT)
    useScreenLockStore.getState().grantConsent()

    const outcome = await screen.findByRole('combobox', { name: 'Hasil kasus' })
    outcome.focus()
    await user.keyboard('{Enter}')
    expect(within(await screen.findByRole('listbox')).getByRole('option', { name: /Berhasil diverifikasi/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    await user.keyboard('{Escape}')

    for (const name of [
      'Setup awal selesai dan layar setup/home terverifikasi',
      'Aktivasi dengan akun Google/Xiaomi yang benar selesai',
      'Backup dipulihkan atau dinyatakan tidak diperlukan',
      'Pelanggan menetapkan PIN/pola baru langsung di perangkat',
    ]) {
      await user.click(screen.getByRole('switch', { name }))
    }
    await chooseOption(user, 'Hasil kasus', 'Berhasil diverifikasi')
    expect(useScreenLockStore.getState().current?.outcome).toBe('verified_success')
    expect(screen.getByText('Selesai')).toBeInTheDocument()

    // Bukti dicabut → hasil kembali ke "Belum diverifikasi".
    await user.click(screen.getByRole('switch', { name: 'Pelanggan menetapkan PIN/pola baru langsung di perangkat' }))
    expect(useScreenLockStore.getState().current?.outcome).toBe('not_verified')
  })

  it('says the ticket is not saved to the cloud when Supabase is not configured', async () => {
    const user = userEvent.setup()
    useCloudStore.setState({ status: 'not_configured' })
    await startTicket(user)
    expect(screen.getByText('Belum tersimpan ke cloud')).toBeInTheDocument()
    expect(screen.getByText('Supabase belum dikonfigurasi')).toBeInTheDocument()
  })

  it('asks for consent before the first cloud save and shows Tersimpan only after the server confirms', async () => {
    const user = userEvent.setup()
    const single = vi.fn().mockResolvedValue({ data: { updated_at: '2026-10-24T03:00:00Z' }, error: null })
    const upsert = vi.fn(() => ({ select: () => ({ single }) }))
    const limit = vi.fn().mockResolvedValue({ data: [], error: null })
    const fake = {
      from: vi.fn(() => ({ upsert, select: () => ({ order: () => ({ limit }) }) })),
    } as unknown as SupabaseClient
    setSupabaseForTests(fake)
    useCloudStore.setState({ status: 'signed_in', userId: 'a1111111-1111-4111-8111-111111111111', email: 'teknisi@example.test' })

    await startTicket(user)
    expect(screen.getByRole('button', { name: 'Simpan ke Supabase' })).toBeDisabled()
    expect(screen.getByText(/Pilih tipe masalah sebelum menyimpan/)).toBeInTheDocument()

    await chooseOption(user, 'Tipe masalah', 'Lupa PIN/pola/sandi layar')
    await user.click(screen.getByRole('button', { name: 'Simpan ke Supabase' }))
    const dialog = await screen.findByRole('dialog', { name: 'Simpan catatan kasus ke Supabase?' })
    expect(within(dialog).getByText('PIN, pola, kata sandi, OTP, kode pemulihan, atau token')).toBeInTheDocument()
    expect(within(dialog).getByText('Email/username akun Google/Xiaomi pelanggan')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Batal' }))
    expect(upsert).not.toHaveBeenCalled()
    expect(screen.queryByText('Tersimpan')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Simpan ke Supabase' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Simpan ke Supabase' }))
    expect(await screen.findByText('Tersimpan')).toBeInTheDocument()
    expect(upsert).toHaveBeenCalledTimes(1)
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ issue_type: 'screen_pin_pattern', data_priority: 'unknown', chosen_path: 'unresolved' }),
      { onConflict: 'id' },
    )
  })
})
