import * as Dialog from '@radix-ui/react-dialog'
import { LogIn, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { cn } from '@/lib/cn'
import { CredentialsSchema, useCloudStore } from '@/store/cloudStore'
import { Button } from '@/components/ui/Button'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { TextField } from '@/components/ui/TextField'

type Mode = 'sign-in' | 'sign-up'

/**
 * Masuk / Buat akun aplikasi (Supabase Auth email/password, DESIGN.md §18). Bukan akun
 * Google/produsen perangkat. Kata sandi tidak disimpan aplikasi; sesi hanya di memori.
 */
export function AccountDialog({ triggerLabel = 'Masuk untuk menyimpan ke cloud' }: { triggerLabel?: string }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const status = useCloudStore((s) => s.status)
  const authError = useCloudStore((s) => s.authError)
  const notice = useCloudStore((s) => s.notice)
  const signIn = useCloudStore((s) => s.signIn)
  const signUp = useCloudStore((s) => s.signUp)
  const busy = status === 'authenticating'

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const parsed = CredentialsSchema.safeParse({ email, password })
    if (!parsed.success) {
      const errors: { email?: string; password?: string } = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]
        if (key === 'email' || key === 'password') errors[key] ??= issue.message
      }
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    const ok =
      mode === 'sign-in'
        ? await signIn(parsed.data.email, parsed.data.password)
        : (await signUp(parsed.data.email, parsed.data.password)) === 'signed_in'
    setPassword('')
    if (ok) setOpen(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button size="sm" icon={<LogIn aria-hidden className="size-4" />}>
          {triggerLabel}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-overlay fixed inset-0 z-[var(--z-dialog-overlay)] bg-black/60" />
        <Dialog.Content className="animate-popover fixed top-1/2 left-1/2 z-[var(--z-dialog)] w-[min(460px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-ui-xl border border-line-default bg-raised p-6 shadow-[var(--shadow-popover)]">
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="text-xl font-semibold text-fg">
              {mode === 'sign-in' ? 'Masuk ke akun aplikasi' : 'Buat akun aplikasi'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm" aria-label="Tutup" icon={<X aria-hidden className="size-[18px]" />} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 text-sm text-fg-2">
            Akun FRP Recovery Assistant untuk menyimpan catatan kasus ke Supabase. Jangan memakai akun Google atau
            akun produsen milik pelanggan.
          </Dialog.Description>

          <div role="tablist" aria-label="Mode akun" className="mt-4 grid grid-cols-2 gap-1 rounded-ui-md border border-line bg-field p-1">
            {(['sign-in', 'sign-up'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  'focus-ring h-9 rounded-ui-sm text-sm font-medium transition-colors duration-[var(--duration-fast)]',
                  mode === m ? 'bg-blue text-white' : 'text-fg-2 hover:bg-raised hover:text-fg',
                )}
              >
                {m === 'sign-in' ? 'Masuk' : 'Buat akun'}
              </button>
            ))}
          </div>

          <form className="mt-4 flex flex-col gap-3" onSubmit={(event) => void submit(event)} noValidate>
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={fieldErrors.email}
              disabled={busy}
            />
            <TextField
              label="Kata sandi"
              type="password"
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={fieldErrors.password}
              hint={mode === 'sign-up' ? 'Minimal 8 karakter.' : undefined}
              disabled={busy}
            />
            {authError ? (
              <InlineAlert tone="danger" title="Gagal">
                {authError}
              </InlineAlert>
            ) : null}
            {notice ? (
              <InlineAlert tone="info" title="Verifikasi email">
                {notice}
              </InlineAlert>
            ) : null}
            <Button type="submit" variant="solid" loading={busy}>
              {mode === 'sign-in' ? 'Masuk' : 'Buat akun'}
            </Button>
            <p className="text-xs leading-relaxed text-fg-muted">
              Sesi hanya berlaku selama aplikasi terbuka (penyimpanan sesi aman belum tersedia). Pemulihan kata sandi
              lewat tautan email belum didukung di aplikasi desktop.
            </p>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
