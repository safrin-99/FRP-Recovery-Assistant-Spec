import { defineConfig } from '@playwright/test'

// Memakai Microsoft Edge yang sudah terpasang (channel "msedge") agar tidak perlu
// mengunduh browser Playwright. Edge berbasis Chromium seperti WebView2 pada Tauri.
// Catatan: ini menguji UI web lewat Vite dev server, BUKAN jendela Tauri native.
export default defineConfig({
  testDir: './e2e',
  snapshotDir: './e2e/__screenshots__',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:1420',
    channel: 'msedge',
    viewport: { width: 1536, height: 1024 },
    colorScheme: 'dark',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:1420',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
