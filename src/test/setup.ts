import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { resetScreenLockStore } from '@/features/screenLock/store'
import { setSupabaseForTests } from '@/services/supabase/client'
import { resetAppStore } from '@/store/appStore'
import { resetCloudStoreForTests } from '@/store/cloudStore'
import { resetSettingsStore } from '@/store/settingsStore'

// jsdom tidak menyediakan API berikut yang dipakai Radix/cmdk.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver
Element.prototype.scrollIntoView ??= function scrollIntoView() {}
Element.prototype.scrollTo ??= function scrollTo() {}
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.setPointerCapture ??= () => {}

beforeEach(() => {
  resetAppStore()
  resetSettingsStore()
  resetScreenLockStore()
  resetCloudStoreForTests()
  setSupabaseForTests(null)
})

afterEach(() => {
  cleanup()
})
