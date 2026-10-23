import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { ClearLogsButton } from '@/components/logs/ClearLogsButton'
import { LogViewer } from '@/components/logs/LogViewer'
import { AppCombobox } from '@/components/ui/AppCombobox'
import { AppSelect } from '@/components/ui/AppSelect'
import { Panel } from '@/components/ui/Panel'
import { DemoBadge } from '@/components/ui/StatusBadge'
import { useAppStore } from '@/store/appStore'
import { LOG_CATEGORIES } from '@/types/domain'

const LEVEL_OPTIONS = [
  { value: 'all', label: 'Semua level' },
  { value: 'info', label: 'Info' },
  { value: 'success', label: 'Berhasil' },
  { value: 'warning', label: 'Peringatan' },
  { value: 'error', label: 'Error' },
]

const CATEGORY_OPTIONS = LOG_CATEGORIES.map((category) => ({ value: category, label: category }))

export function LogsPage() {
  const logs = useAppStore((s) => s.logs)
  const [level, setLevel] = useState('all')
  const [category, setCategory] = useState('')

  const filtered = useMemo(
    () =>
      logs.filter(
        (entry) => (level === 'all' || entry.level === level) && (category === '' || entry.category === category),
      ),
    [logs, level, category],
  )
  const hasDemo = logs.some((entry) => entry.source === 'demo')

  return (
    <div className="flex h-full min-h-[480px] flex-col gap-4">
      <PageHeader
        title="Logs"
        description="Log sesi dengan waktu lokal, kategori, dan tingkat severity. Riwayat tersimpan dan ekspor dijadwalkan pada Milestone 3."
        actions={<ClearLogsButton />}
      />
      <Panel aria-label="Filter log" className="flex flex-wrap items-end gap-4 p-4">
        <AppSelect className="w-[220px]" label="Level" value={level} onValueChange={setLevel} options={LEVEL_OPTIONS} />
        <AppCombobox
          className="w-[260px]"
          label="Kategori"
          value={category}
          onValueChange={setCategory}
          options={CATEGORY_OPTIONS}
          placeholder="Semua kategori"
          searchPlaceholder="Cari kategori…"
          emptyMessage="Kategori tidak ditemukan."
        />
        <p className="ml-auto self-center text-sm text-fg-muted" aria-live="polite">
          Menampilkan {filtered.length} dari {logs.length} entri
        </p>
        {hasDemo ? <DemoBadge className="self-center" /> : null}
      </Panel>
      <LogViewer
        logs={filtered}
        showCategory
        className="min-h-[240px] flex-1"
        emptyMessage={logs.length === 0 ? 'Belum ada log.' : 'Tidak ada log yang cocok dengan filter.'}
      />
    </div>
  )
}
