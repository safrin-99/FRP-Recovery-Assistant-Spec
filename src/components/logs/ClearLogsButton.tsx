import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

/** "Bersihkan Log" — selalu lewat konfirmasi (PRD §7.8). */
export function ClearLogsButton({ className }: { className?: string }) {
  const count = useAppStore((s) => s.logs.length)
  const clearLogs = useAppStore((s) => s.clearLogs)
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        size="sm"
        className={className}
        disabled={count === 0}
        icon={<Trash2 aria-hidden className="size-[18px]" />}
        onClick={() => setOpen(true)}
      >
        Bersihkan Log
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Bersihkan log?"
        description="Semua entri log sesi ini akan dihapus dari tampilan."
        impact={`${count} entri akan dihapus. Versi ini belum menyimpan riwayat log ke disk, jadi log yang dihapus tidak dapat dipulihkan.`}
        confirmLabel="Bersihkan Log"
        onConfirm={clearLogs}
      />
    </>
  )
}
