import * as Dialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
import { Button } from './Button'

/**
 * Dialog konfirmasi (DESIGN.md §12): judul, dampak tindakan, tombol batal & tindakan.
 * Tidak ada operasi destruktif di belakang satu klik tanpa dialog ini.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  impact,
  confirmLabel,
  cancelLabel = 'Batal',
  tone = 'danger',
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  /** Dampak konkret yang akan terjadi bila dikonfirmasi. */
  impact?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  tone?: 'danger' | 'primary'
  onConfirm: () => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-overlay fixed inset-0 z-[var(--z-dialog-overlay)] bg-black/60" />
        <Dialog.Content
          role="alertdialog"
          className="animate-popover fixed top-1/2 left-1/2 z-[var(--z-dialog)] w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-ui-xl border border-line-default bg-raised p-6 shadow-[var(--shadow-popover)]"
        >
          <Dialog.Title className="text-lg font-semibold text-fg">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-relaxed text-fg-2">{description}</Dialog.Description>
          {impact ? (
            <div className="mt-3 rounded-ui-md border border-line-default bg-field px-3.5 py-3 text-sm leading-relaxed text-fg-2">
              {impact}
            </div>
          ) : null}
          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <Button variant="outline">{cancelLabel}</Button>
            </Dialog.Close>
            <Button
              variant={tone === 'danger' ? 'danger' : 'solid'}
              onClick={() => {
                onConfirm()
                onOpenChange(false)
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
