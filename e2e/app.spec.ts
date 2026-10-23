import { expect, test, type Page } from '@playwright/test'

// Screenshot ditulis ke folder yang di-gitignore untuk review visual manual terhadap
// reference-ui.png. Baseline regresi piksel belum ditetapkan (lihat README).
const SHOTS = 'e2e/__screenshots__/actual'

const PAGES = [
  { label: 'Home', id: 'home' },
  { label: 'FRP Recovery', id: 'frp-recovery' },
  { label: 'AI Assistant', id: 'ai-assistant' },
  { label: 'Device Info', id: 'device-info' },
  { label: 'Flash / Factory Reset', id: 'flash-reset' },
  { label: 'Tools', id: 'tools' },
  { label: 'Drivers', id: 'drivers' },
  { label: 'Logs', id: 'logs' },
  { label: 'Settings', id: 'settings' },
] as const

const sidebar = (page: Page) => page.getByRole('navigation', { name: 'Halaman' })

async function goTo(page: Page, label: string) {
  await sidebar(page).getByRole('button', { name: label, exact: true }).click()
}

async function enableDemo(page: Page) {
  await goTo(page, 'Settings')
  await page.getByRole('switch', { name: 'Tampilkan data contoh' }).click()
  await goTo(page, 'Home')
}

async function box(page: Page, selector: string) {
  const b = await page.locator(selector).first().boundingBox()
  if (!b) throw new Error(`Tidak ada bounding box untuk ${selector}`)
  return b
}

async function visibleNativeDropdowns(page: Page) {
  return page.evaluate(
    () =>
      [...document.querySelectorAll('select, datalist')].filter((el) => {
        const style = getComputedStyle(el)
        const rect = el.getBoundingClientRect()
        return (
          el.getAttribute('aria-hidden') !== 'true' &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          rect.width > 1 &&
          rect.height > 1
        )
      }).length,
  )
}

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'FRP Recovery', level: 1 })).toBeVisible()
})

test.describe('1536×1024 (target referensi)', () => {
  test.use({ viewport: { width: 1536, height: 1024 } })

  test('Home geometry follows DESIGN.md within tolerance', async ({ page }) => {
    await enableDemo(page)
    await page.waitForTimeout(300)

    const near = (actual: number, expected: number, tolerance: number) =>
      expect(Math.abs(actual - expected), `actual ${actual} vs ${expected}`).toBeLessThanOrEqual(tolerance)

    const titlebar = await box(page, 'header')
    near(titlebar.height, 84, 1)

    const aside = await box(page, 'aside')
    near(aside.x, 13, 2)
    near(aside.y, 92, 2)
    near(aside.width, 264, 2)

    const hero = await box(page, 'section[aria-labelledby="hero-title"]')
    near(hero.x, 297, 3)
    near(hero.width, 1220, 6)
    near(hero.height, 308, 6)

    const methodPanel = await box(page, 'section[aria-labelledby="method-title"]')
    near(methodPanel.width, 824, 8)

    const devicePanel = await box(page, 'section[aria-labelledby="device-info-title"]')
    near(devicePanel.width, 381, 3)
    near(devicePanel.x - (methodPanel.x + methodPanel.width), 16, 2)

    const primary = await box(page, 'button:has-text("Mulai Diagnosis FRP")')
    near(primary.height, 70, 2)
    near(primary.width, methodPanel.width - 40, 2)

    // Tidak ada scroll vertikal maupun horizontal pada ukuran target.
    const scroll = await page.locator('main').evaluate((el) => [el.scrollHeight, el.clientHeight])
    expect(scroll[0]).toBeLessThanOrEqual(scroll[1]!)
    expect(await horizontalOverflow(page)).toBe(false)

    await page.screenshot({ path: `${SHOTS}/home-demo-1536x1024.png` })
  })

  test('no-device state is honest', async ({ page }) => {
    await expect(page.getByText('Device Ready')).toHaveCount(0)
    await expect(page.getByText('DEMO', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Mulai Diagnosis FRP/ })).toBeDisabled()
    await page.getByRole('button', { name: 'Auto Detect' }).first().click()
    await expect(page.getByText(/aplikasi desktop/).first()).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/home-nodevice-1536x1024.png` })
  })

  test('every page renders without native dropdowns or horizontal overflow', async ({ page }) => {
    await enableDemo(page)
    for (const target of PAGES) {
      await goTo(page, target.label)
      await expect(page.locator('main')).toHaveAttribute('data-page', target.id)
      expect(await visibleNativeDropdowns(page), target.label).toBe(0)
      expect(await horizontalOverflow(page), target.label).toBe(false)
      await expect(page.locator('body')).not.toContainText(/bypass/i)
      await page.screenshot({ path: `${SHOTS}/page-${target.id}-1536x1024.png` })
    }
  })

  test('custom select works with the keyboard and never shows a native popup', async ({ page }) => {
    await enableDemo(page)
    await goTo(page, 'Logs')
    const level = page.getByRole('combobox', { name: 'Level' })
    await level.focus()
    await page.keyboard.press('Enter')
    const listbox = page.getByRole('listbox')
    await expect(listbox).toBeVisible()
    expect(await visibleNativeDropdowns(page)).toBe(0)
    await page.waitForTimeout(250)
    await page.screenshot({ path: `${SHOTS}/dropdown-open-1536x1024.png` })

    // Popup berada dalam window dan tidak terpotong.
    const popup = await listbox.boundingBox()
    expect(popup).not.toBeNull()
    expect(popup!.y + popup!.height).toBeLessThanOrEqual(1024)

    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(listbox).toBeHidden()
    await expect(level).toBeFocused()
    await expect(level).toHaveText(/Peringatan/)
    await expect(page.getByText('Menampilkan 1 dari 4 entri')).toBeVisible()

    await level.press('Enter')
    await expect(page.getByRole('listbox')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('listbox')).toBeHidden()
    await expect(level).toBeFocused()

    // Klik di luar menutup popup.
    await level.click()
    await expect(page.getByRole('listbox')).toBeVisible()
    await page.mouse.click(1300, 900)
    await expect(page.getByRole('listbox')).toBeHidden()
  })

  test('custom combobox filters and shows an empty state', async ({ page }) => {
    await goTo(page, 'Logs')
    await page.getByRole('button', { name: 'Kategori', exact: true }).click()
    const search = page.getByRole('combobox', { name: 'Cari Kategori' })
    await expect(search).toBeFocused()
    await search.fill('zzz')
    await expect(page.getByText('Kategori tidak ditemukan.')).toBeVisible()
    await search.fill('Fast')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: 'Kategori', exact: true })).toHaveText(/Fastboot/)
  })

  test('demo diagnosis shows staged progress and can be cancelled', async ({ page }) => {
    await enableDemo(page)
    await page.getByRole('button', { name: /Mulai Diagnosis FRP/ }).click()
    const cancel = page.getByRole('button', { name: /Batalkan Diagnosis/ })
    await expect(cancel).toBeVisible()
    const progress = page.getByRole('progressbar', { name: 'Progress diagnosis' })
    await expect(progress).not.toHaveAttribute('aria-valuenow', '0', { timeout: 3000 })
    await cancel.click()
    await expect(page.getByRole('button', { name: /Mulai Diagnosis FRP/ })).toBeVisible()
    await expect(page.getByRole('log', { name: 'Log diagnosis' })).toContainText('Diagnosis dibatalkan oleh pengguna.')
  })
})

test.describe('1200×760 (ukuran minimum nyaman)', () => {
  test.use({ viewport: { width: 1200, height: 760 } })

  test('layout stays usable without horizontal overflow', async ({ page }) => {
    await enableDemo(page)
    expect(await horizontalOverflow(page)).toBe(false)
    const aside = await box(page, 'aside')
    expect(aside.width).toBeGreaterThan(200) // sidebar penuh pada 1200 px
    for (const target of PAGES) {
      await expect(sidebar(page).getByRole('button', { name: target.label, exact: true })).toBeVisible()
    }
    // Tombol aksi utama dapat dicapai (scroll lokal di area konten).
    const primary = page.getByRole('button', { name: /Mulai Diagnosis FRP/ })
    await primary.scrollIntoViewIfNeeded()
    await expect(primary).toBeInViewport()
    await page.locator('main').evaluate((el) => el.scrollTo({ top: 0 }))
    await page.screenshot({ path: `${SHOTS}/home-demo-1200x760.png` })
  })
})

test.describe('1280×672 (laptop 1920×1080 @150%, jendela Tauri ter-maximize)', () => {
  test.use({ viewport: { width: 1280, height: 672 } })

  test('brand buttons form an even grid without orphan rows', async ({ page }) => {
    expect(await horizontalOverflow(page)).toBe(false)
    const buttons = page.getByRole('group', { name: 'Pilih Brand Perangkat' }).getByRole('button')
    await expect(buttons).toHaveCount(11)
    const boxes = await buttons.evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect()
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) }
      }),
    )
    // Grid seragam: semua tombol selebar sama dan baris pertama terisi penuh.
    const widths = new Set(boxes.map((b) => b.w))
    expect(widths.size).toBe(1)
    const firstRowY = boxes[0]!.y
    const perRow = boxes.filter((b) => b.y === firstRowY).length
    expect(perRow).toBeGreaterThanOrEqual(3)
    await page.getByRole('heading', { name: 'Pilih Brand Perangkat' }).scrollIntoViewIfNeeded()
    await page.screenshot({ path: `${SHOTS}/home-brands-1280x672.png` })
  })
})

test.describe('1100×760 (di bawah lebar desktop)', () => {
  test.use({ viewport: { width: 1100, height: 760 } })

  test('sidebar collapses to icons and keeps accessible names', async ({ page }) => {
    expect(await horizontalOverflow(page)).toBe(false)
    const aside = await box(page, 'aside')
    expect(aside.width).toBeLessThan(100)
    await goTo(page, 'Settings')
    await expect(page.locator('main')).toHaveAttribute('data-page', 'settings')
    await page.screenshot({ path: `${SHOTS}/settings-1100x760.png` })
  })
})

test.describe('1024×640 (minWidth/minHeight jendela Tauri)', () => {
  test.use({ viewport: { width: 1024, height: 640 } })

  test('every page stays reachable without horizontal overflow', async ({ page }) => {
    await enableDemo(page)
    for (const target of PAGES) {
      await goTo(page, target.label)
      await expect(page.locator('main')).toHaveAttribute('data-page', target.id)
      expect(await horizontalOverflow(page), target.label).toBe(false)
    }
    await goTo(page, 'Home')
    await page.screenshot({ path: `${SHOTS}/home-demo-1024x640.png` })
  })
})
