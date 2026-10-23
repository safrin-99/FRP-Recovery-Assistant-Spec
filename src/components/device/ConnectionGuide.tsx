import * as Dialog from '@radix-ui/react-dialog'
import { BookOpen, X } from 'lucide-react'
import { useState } from 'react'
import { OFFICIAL_LINKS } from '@/data/catalog'
import { useAppStore } from '@/store/appStore'
import type { BrandId } from '@/types/domain'
import { Button } from '@/components/ui/Button'
import { ExternalLink } from '@/components/ui/ExternalLink'
import { InlineAlert } from '@/components/ui/InlineAlert'

interface BrandSteps {
  developerOptions: string
  usbDebugging: string
}

/** Lokasi menu berbeda tiap merek; selain yang dikenal, pakai jalur Android umum. */
function stepsFor(brand: BrandId): BrandSteps {
  if (brand === 'xiaomi') {
    return {
      developerOptions:
        'Setelan → Tentang ponsel → ketuk "Versi OS" (HyperOS) atau "Versi MIUI" sebanyak 7 kali sampai muncul "Anda sekarang adalah pengembang".',
      usbDebugging: 'Setelan → Setelan tambahan → Opsi pengembang → aktifkan "Debugging USB".',
    }
  }
  if (brand === 'samsung') {
    return {
      developerOptions:
        'Setelan → Tentang ponsel → Informasi perangkat lunak → ketuk "Nomor versi" sebanyak 7 kali.',
      usbDebugging: 'Setelan → Opsi pengembang (paling bawah) → aktifkan "USB debugging".',
    }
  }
  return {
    developerOptions: 'Setelan → Tentang ponsel → ketuk "Nomor versi / Build number" sebanyak 7 kali.',
    usbDebugging: 'Setelan → Sistem → Opsi pengembang → aktifkan "USB debugging".',
  }
}

const BRAND_NOTE: Partial<Record<BrandId, string>> = {
  xiaomi: 'Langkah untuk Xiaomi / Redmi / POCO.',
  samsung: 'Langkah untuk Samsung.',
}

/** Tombol + dialog panduan menghubungkan ponsel lewat USB debugging (langkah dari pengaturan Android resmi). */
export function ConnectionGuideButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const brand = useAppStore((s) => s.brand)
  const steps = stepsFor(brand)

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button size="sm" variant="ghost" className={className} icon={<BookOpen aria-hidden className="size-4" />}>
          Cara menghubungkan
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-overlay fixed inset-0 z-[var(--z-dialog-overlay)] bg-black/60" />
        <Dialog.Content className="animate-popover fixed top-1/2 left-1/2 z-[var(--z-dialog)] max-h-[calc(100vh-48px)] w-[min(600px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-ui-xl border border-line-default bg-raised p-6 shadow-[var(--shadow-popover)]">
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="text-xl font-semibold text-fg">Cara menghubungkan ponsel</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm" aria-label="Tutup panduan" icon={<X aria-hidden className="size-[18px]" />} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 text-sm text-fg-2">
            ADB hanya dapat melihat ponsel bila USB debugging diaktifkan dari dalam ponsel.{' '}
            {BRAND_NOTE[brand] ?? 'Pilih brand di Home untuk langkah yang lebih spesifik.'}
          </Dialog.Description>

          <ol className="mt-4 list-decimal space-y-2.5 pl-5 text-[15px] leading-relaxed text-fg-2">
            <li>
              <span className="font-semibold text-fg">Aktifkan Opsi pengembang.</span> {steps.developerOptions}
            </li>
            <li>
              <span className="font-semibold text-fg">Aktifkan USB debugging.</span> {steps.usbDebugging}
            </li>
            <li>
              <span className="font-semibold text-fg">Sambungkan kabel data</span> langsung ke port laptop (bukan hub),
              lalu pilih <span className="font-semibold text-fg">"Transfer file"</span> pada notifikasi USB ponsel. Mode
              "Tethering USB" tidak diperlukan.
            </li>
            <li>
              <span className="font-semibold text-fg">Buka kunci layar</span> dan tekan{' '}
              <span className="font-semibold text-fg">"Izinkan"</span> pada dialog "Izinkan USB debugging?" (centang
              "Selalu izinkan dari komputer ini").
            </li>
            <li>
              Klik <span className="font-semibold text-fg">Auto Detect</span> lagi. Bila masih belum terdeteksi, buka
              halaman Drivers → Periksa driver.
            </li>
          </ol>

          <InlineAlert tone="info" title="Ponsel terkunci atau tertahan di verifikasi akun?" className="mt-4">
            USB debugging tidak dapat diaktifkan dari layar terkunci atau layar verifikasi akun Google, sehingga ADB tidak
            akan melihat ponsel. Gunakan jalur Recovery / Fastboot Guide atau panduan pemulihan resmi di halaman FRP
            Recovery.
          </InlineAlert>

          <p className="mt-4 text-sm">
            <ExternalLink link={OFFICIAL_LINKS.oemUsbDrivers} />
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
