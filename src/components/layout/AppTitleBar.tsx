import { isTauri } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { CircleHelp, Copy, History, Minus, Settings, ShieldCheck, Square, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { useAppStore } from '@/store/appStore'

const DESKTOP_ONLY_HINT = 'Tersedia di aplikasi desktop (Tauri).'

function TitleLink({
  icon,
  label,
  onClick,
  active = false,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'focus-ring flex h-10 items-center gap-2.5 rounded-ui-md px-3 text-[15px] font-medium transition-colors duration-[var(--duration-fast)]',
        active ? 'text-fg' : 'text-fg-2 hover:bg-raised hover:text-fg',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function WindowButton({
  label,
  onClick,
  disabled,
  danger = false,
  children,
}: {
  label: string
  onClick: () => void
  disabled: boolean
  danger?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={disabled ? `${label} — ${DESKTOP_ONLY_HINT}` : label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'focus-ring grid h-10 w-12 place-items-center rounded-ui-md text-fg-2 transition-colors duration-[var(--duration-fast)] disabled:opacity-60',
        danger ? 'enabled:hover:bg-danger enabled:hover:text-white' : 'enabled:hover:bg-raised enabled:hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}

export function AppTitleBar() {
  const page = useAppStore((s) => s.page)
  const setPage = useAppStore((s) => s.setPage)
  const setHelpOpen = useAppStore((s) => s.setHelpOpen)
  const desktop = isTauri()
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    if (!desktop) return
    const appWindow = getCurrentWindow()
    let unlisten: (() => void) | undefined
    let cancelled = false
    const sync = () => {
      void appWindow.isMaximized().then((value) => {
        if (!cancelled) setMaximized(value)
      })
    }
    sync()
    void appWindow.onResized(sync).then((fn) => {
      if (cancelled) fn()
      else unlisten = fn
    })
    return () => {
      cancelled = true
      unlisten?.()
    }
  }, [desktop])

  return (
    <header
      data-tauri-drag-region
      className="relative z-[var(--z-titlebar)] flex h-[84px] shrink-0 items-center justify-between border-b border-line bg-titlebar pr-3 pl-6 select-none"
    >
      <div data-tauri-drag-region className="flex items-center gap-4">
        <ShieldCheck aria-hidden className="pointer-events-none size-11 text-blue" strokeWidth={1.75} />
        <div className="pointer-events-none leading-tight">
          <p className="text-[28px] font-bold tracking-tight text-fg">FRP Recovery Assistant</p>
          <p className="text-[15px] text-fg-2">Android Recovery &amp; Diagnostics Suite</p>
        </div>
      </div>

      <nav aria-label="Pintasan jendela" className="flex items-center gap-1">
        <TitleLink
          icon={<Settings aria-hidden className="size-[22px]" />}
          label="Settings"
          active={page === 'settings'}
          onClick={() => setPage('settings')}
        />
        <TitleLink
          icon={<History aria-hidden className="size-[22px]" />}
          label="Logs"
          active={page === 'logs'}
          onClick={() => setPage('logs')}
        />
        <TitleLink
          icon={<CircleHelp aria-hidden className="size-[22px]" />}
          label="Help"
          onClick={() => setHelpOpen(true)}
        />
        <span aria-hidden className="mx-2 h-8 w-px bg-line-default" />
        <WindowButton label="Minimize" disabled={!desktop} onClick={() => void getCurrentWindow().minimize()}>
          <Minus aria-hidden className="size-5" />
        </WindowButton>
        <WindowButton
          label={maximized ? 'Restore' : 'Maximize'}
          disabled={!desktop}
          onClick={() => void getCurrentWindow().toggleMaximize()}
        >
          {maximized ? <Copy aria-hidden className="size-[18px]" /> : <Square aria-hidden className="size-[18px]" />}
        </WindowButton>
        <WindowButton label="Close" disabled={!desktop} danger onClick={() => void getCurrentWindow().close()}>
          <X aria-hidden className="size-[22px]" />
        </WindowButton>
      </nav>
    </header>
  )
}
