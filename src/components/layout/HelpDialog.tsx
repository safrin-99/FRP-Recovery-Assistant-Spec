import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { OFFICIAL_LINKS } from '@/data/catalog'
import { useAppStore } from '@/store/appStore'
import { Button } from '@/components/ui/Button'
import { ExternalLink } from '@/components/ui/ExternalLink'

export function HelpDialog() {
  const open = useAppStore((s) => s.helpOpen)
  const setOpen = useAppStore((s) => s.setHelpOpen)

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-overlay fixed inset-0 z-[var(--z-dialog-overlay)] bg-black/60" />
        <Dialog.Content className="animate-popover fixed top-1/2 left-1/2 z-[var(--z-dialog)] max-h-[calc(100vh-48px)] w-[min(560px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-ui-xl border border-line-default bg-raised p-6 shadow-[var(--shadow-popover)]">
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="text-xl font-semibold text-fg">Bantuan</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm" aria-label="Tutup bantuan" icon={<X aria-hidden className="size-[18px]" />} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 text-sm text-fg-2">
            FRP Recovery Assistant membantu diagnosis perangkat Android dan pemulihan lewat jalur resmi.
          </Dialog.Description>

          <h3 className="mt-5 text-[15px] font-semibold text-fg">Yang dilakukan aplikasi</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-fg-2">
            <li>Memeriksa koneksi USB, ADB, dan Fastboot serta menampilkan log diagnosis.</li>
            <li>Menunjukkan panduan pemulihan akun dan dukungan dari produsen resmi.</li>
            <li>Menjelaskan hasil diagnosis lewat AI Assistant (opsional, dengan persetujuan Anda).</li>
          </ul>

          <h3 className="mt-5 text-[15px] font-semibold text-fg">Yang tidak dilakukan aplikasi</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-fg-2">
            <li>Tidak membuka PIN/pola, tidak menonaktifkan atau melewati FRP, dan tidak mendekripsi data.</li>
            <li>Tidak melakukan factory reset, flashing, unlock bootloader, atau penghapusan data.</li>
            <li>Tidak meminta atau menyimpan PIN, pola, kata sandi, OTP, atau token akun.</li>
          </ul>

          <h3 className="mt-5 text-[15px] font-semibold text-fg">Tautan resmi</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            <li>
              <ExternalLink link={OFFICIAL_LINKS.platformTools}>Android SDK Platform-Tools (ADB/Fastboot)</ExternalLink>
            </li>
            <li>
              <ExternalLink link={OFFICIAL_LINKS.googleAccountHelp} />
            </li>
          </ul>
          <p className="mt-5 text-xs text-fg-muted">
            Versi ini (Milestone 2) mendeteksi perangkat lewat ADB/Fastboot dan hanya membaca status. Riwayat log
            permanen, AI Assistant, dan akun cloud belum tersedia.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
