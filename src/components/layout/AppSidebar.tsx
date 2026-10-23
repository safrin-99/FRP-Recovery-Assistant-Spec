import { NAV_ITEMS } from '@/data/catalog'
import { useAppStore } from '@/store/appStore'
import { ConnectionStatusCard } from './ConnectionStatusCard'
import { SidebarNavItem } from './SidebarNavItem'

export function AppSidebar() {
  const page = useAppStore((s) => s.page)
  const setPage = useAppStore((s) => s.setPage)

  return (
    <aside
      aria-label="Navigasi utama"
      className="relative z-[var(--z-sidebar)] flex min-h-0 w-[264px] shrink-0 flex-col self-stretch rounded-ui-xl border border-line bg-sidebar px-2 py-3 max-[1199px]:w-[76px]"
    >
      <nav aria-label="Halaman" className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <SidebarNavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={page === item.id}
            onClick={() => setPage(item.id)}
          />
        ))}
      </nav>
      <div className="mt-3 shrink-0 px-1">
        <ConnectionStatusCard />
      </div>
    </aside>
  )
}
