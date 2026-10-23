import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { NAV_ITEMS } from '@/data/catalog'
import { useAppStore } from '@/store/appStore'
import { App } from './App'

function sidebarNav() {
  return within(screen.getByRole('navigation', { name: 'Halaman' }))
}

function expectNoVisibleNativeDropdown() {
  const natives = [...document.querySelectorAll('select, datalist')].filter(
    (el) => el.getAttribute('aria-hidden') !== 'true',
  )
  expect(natives).toHaveLength(0)
}

describe('App shell', () => {
  it('renders the sidebar in the PRD order with Home active', () => {
    render(<App />)
    const buttons = sidebarNav().getAllByRole('button')
    expect(buttons).toHaveLength(NAV_ITEMS.length)
    NAV_ITEMS.forEach((item, index) => expect(buttons[index]).toHaveAccessibleName(item.label))
    expect(sidebarNav().getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
  })

  it('uses the operational product name and labels, not the legacy mockup text', () => {
    render(<App />)
    expect(screen.getByText('FRP Recovery Assistant')).toBeInTheDocument()
    expect(screen.getByText('Android Recovery & Diagnostics Suite')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mulai Diagnosis FRP/ })).toBeInTheDocument()
    expect(document.body.textContent ?? '').not.toMatch(/bypass/i)
  })

  it('navigates to every page without rendering a native dropdown', async () => {
    const user = userEvent.setup()
    render(<App />)
    for (const item of NAV_ITEMS) {
      await user.click(sidebarNav().getByRole('button', { name: item.label }))
      expect(sidebarNav().getByRole('button', { name: item.label })).toHaveAttribute('aria-current', 'page')
      expect(document.querySelector('main')).toHaveAttribute('data-page', item.id)
      expectNoVisibleNativeDropdown()
      expect(document.body.textContent ?? '').not.toMatch(/bypass/i)
    }
  })

  it('shows an honest empty state with no device and never claims "Device Ready"', () => {
    render(<App />)
    expect(screen.getAllByText('Tidak ada perangkat').length).toBeGreaterThan(0)
    expect(screen.queryByText('Device Ready')).not.toBeInTheDocument()
    expect(screen.queryByText('DEMO')).not.toBeInTheDocument()
    const start = screen.getByRole('button', { name: /Mulai Diagnosis FRP/ })
    expect(start).toBeDisabled()
    expect(start).toHaveAccessibleDescription(/aplikasi desktop/)
  })

  it('reports Auto Detect as unavailable instead of inventing a device', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getAllByRole('button', { name: 'Auto Detect' })[0]!)
    await waitFor(() => expect(useAppStore.getState().detection.status).toBe('error'))
    expect(screen.getAllByText(/aplikasi desktop/).length).toBeGreaterThan(0)
    expect(screen.queryByText('Device Ready')).not.toBeInTheDocument()
  })

  it('marks demo data with a DEMO badge and keeps FRP status unverified', async () => {
    render(<App />)
    act(() => useAppStore.getState().setDemoMode(true))
    expect(screen.getAllByText('DEMO').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Galaxy A12')).toBeInTheDocument()
    expect(screen.getByText('Tidak dapat diverifikasi')).toBeInTheDocument()
    expect(screen.queryByText('Terkunci')).not.toBeInTheDocument()
    expect(screen.queryByText('Device Ready')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mulai Diagnosis FRP/ })).toBeEnabled()
  })

  it('selects one method and one brand at a time', async () => {
    const user = userEvent.setup()
    render(<App />)
    const methods = within(screen.getByRole('group', { name: 'Jalur pemulihan' }))
    await user.click(methods.getByRole('button', { name: /Account Recovery/ }))
    expect(methods.getAllByRole('button', { pressed: true })).toHaveLength(1)
    expect(methods.getByRole('button', { name: /Account Recovery/ })).toHaveAttribute('aria-pressed', 'true')

    const brands = within(screen.getByRole('group', { name: 'Pilih Brand Perangkat' }))
    await user.click(brands.getByRole('button', { name: /Xiaomi/ }))
    await user.click(brands.getByRole('button', { name: /Motorola/ }))
    expect(brands.getAllByRole('button', { pressed: true })).toHaveLength(1)
    expect(brands.getByRole('button', { name: /Motorola/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('renders a logo or monogram for every brand while keeping the brand name accessible', () => {
    render(<App />)
    const brands = within(screen.getByRole('group', { name: 'Pilih Brand Perangkat' }))
    for (const label of ['Samsung', 'Xiaomi', 'OPPO', 'vivo', 'realme', 'Infinix', 'TECNO', 'HUAWEI', 'Motorola', 'ASUS', 'Other']) {
      expect(brands.getByRole('button', { name: label })).toBeInTheDocument()
    }
    // Wordmark (Simple Icons) menggantikan teks terlihat; nama tetap dari teks sr-only.
    const samsung = brands.getByRole('button', { name: 'Samsung' })
    expect(samsung.querySelector('svg path')).not.toBeNull()
    expect(within(samsung).getByText('Samsung')).toHaveClass('sr-only')
    // Mark berwarna merek di samping teks.
    expect(brands.getByRole('button', { name: 'HUAWEI' }).querySelector('svg')).toHaveAttribute('fill', '#FF0000')
    // Tanpa aset logo berlisensi: monogram netral.
    expect(brands.getByRole('button', { name: 'realme' })).toHaveTextContent('Rrealme')
    expect(brands.getByRole('button', { name: 'TECNO' }).querySelector('svg path')).toBeNull()
  })

  it('requires confirmation before clearing logs', async () => {
    const user = userEvent.setup()
    render(<App />)
    act(() => useAppStore.getState().setDemoMode(true))
    const count = useAppStore.getState().logs.length
    expect(count).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Bersihkan Log' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Batal' }))
    expect(useAppStore.getState().logs).toHaveLength(count)

    await user.click(screen.getByRole('button', { name: 'Bersihkan Log' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Bersihkan Log' }))
    expect(useAppStore.getState().logs).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Bersihkan Log' })).toBeDisabled()
  })

  it('shows the Data Preservation banner from user-declared conditions', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(sidebarNav().getByRole('button', { name: 'FRP Recovery' }))
    expect(screen.queryByTestId('data-preservation-banner')).not.toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Layar perangkat terkunci?' }))
    await user.click(await screen.findByRole('option', { name: 'Ya' }))
    expect(await screen.findByTestId('data-preservation-banner')).toHaveTextContent(
      'Prioritas: pertahankan data — jangan reset/flash sebelum memahami risiko.',
    )
  })

  it('keeps the AI Assistant in a "not configured" state without fake answers', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(sidebarNav().getByRole('button', { name: 'AI Assistant' }))
    expect(screen.getByText('Belum dikonfigurasi')).toBeInTheDocument()
    expect(screen.getByLabelText('Pertanyaan untuk AI')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Kirim' })).toBeDisabled()
    expect(screen.getByText(/Serial, IMEI, path pengguna/)).toBeInTheDocument()
  })

  it('shows brand-specific connection steps without asking for credentials', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(within(screen.getByRole('group', { name: 'Pilih Brand Perangkat' })).getByRole('button', { name: /Xiaomi/ }))
    await user.click(screen.getByRole('button', { name: 'Cara menghubungkan' }))
    const dialog = await screen.findByRole('dialog', { name: 'Cara menghubungkan ponsel' })
    expect(within(dialog).getByText(/Versi OS/)).toBeInTheDocument()
    expect(within(dialog).getByText(/Setelan tambahan → Opsi pengembang/)).toBeInTheDocument()
    expect(dialog.textContent ?? '').not.toMatch(/kata sandi|password|PIN Anda/i)
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('switches to the light theme from Settings', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(sidebarNav().getByRole('button', { name: 'Settings' }))
    await user.click(screen.getByRole('combobox', { name: 'Tema' }))
    await user.click(await screen.findByRole('option', { name: 'Terang' }))
    expect(document.documentElement.dataset.theme).toBe('light')
    // Hero tetap memakai token gelap sebagai banner merek.
    await user.click(sidebarNav().getByRole('button', { name: 'Home' }))
    expect(screen.getByRole('heading', { name: 'FRP Recovery', level: 1 }).closest('section')).toHaveAttribute('data-theme', 'dark')
  })

  it('opens Help with the safety scope', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Help' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/Tidak membuka PIN\/pola/)).toBeInTheDocument()
  })

  it('disables window controls outside the desktop shell', () => {
    render(<App />)
    for (const name of ['Minimize', 'Maximize', 'Close']) {
      expect(screen.getByRole('button', { name })).toBeDisabled()
    }
  })
})
