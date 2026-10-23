import { useEffect, useRef } from 'react'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { AppTitleBar } from '@/components/layout/AppTitleBar'
import { HelpDialog } from '@/components/layout/HelpDialog'
import { AiAssistantPage } from '@/pages/AiAssistantPage'
import { DeviceInfoPage } from '@/pages/DeviceInfoPage'
import { DriversPage } from '@/pages/DriversPage'
import { FlashResetPage } from '@/pages/FlashResetPage'
import { FrpRecoveryPage } from '@/pages/FrpRecoveryPage'
import { HomePage } from '@/pages/HomePage'
import { LogsPage } from '@/pages/LogsPage'
import { ScreenLockRecoveryPage } from '@/pages/ScreenLockRecoveryPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ToolsPage } from '@/pages/ToolsPage'
import { useAppStore } from '@/store/appStore'
import { useCloudStore } from '@/store/cloudStore'
import type { PageId } from '@/types/domain'

const PAGES: Record<PageId, () => React.JSX.Element> = {
  home: HomePage,
  'screen-lock': ScreenLockRecoveryPage,
  'frp-recovery': FrpRecoveryPage,
  'ai-assistant': AiAssistantPage,
  'device-info': DeviceInfoPage,
  'flash-reset': FlashResetPage,
  tools: ToolsPage,
  drivers: DriversPage,
  logs: LogsPage,
  settings: SettingsPage,
}

export function App() {
  const page = useAppStore((s) => s.page)
  const mainRef = useRef<HTMLElement>(null)
  const Page = PAGES[page]

  // Status online/offline dan sesi Supabase (bila dikonfigurasi).
  useEffect(() => useCloudStore.getState().init(), [])

  // Pindah halaman: kembali ke atas tanpa memindahkan fokus keyboard dari sidebar.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [page])

  return (
    <div className="flex h-full min-w-0 flex-col bg-app">
      <AppTitleBar />
      <div className="flex min-h-0 flex-1 gap-5 pt-2 pr-[19px] pb-6 pl-[13px] max-[1199px]:gap-4">
        <AppSidebar />
        <main
          ref={mainRef}
          id="main"
          data-page={page}
          className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto pt-3"
        >
          <Page />
        </main>
      </div>
      <HelpDialog />
    </div>
  )
}
