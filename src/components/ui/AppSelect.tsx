import * as Select from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp, LoaderCircle } from 'lucide-react'
import { useId } from 'react'
import { cn } from '@/lib/cn'

export interface SelectOption {
  value: string
  label: string
  /** Keterangan kecil di bawah label (mis. "Belum tersedia"). */
  description?: string
  disabled?: boolean
}

export interface AppSelectProps {
  /** Label aksesibel; tampil di atas field kecuali `hideLabel`. */
  label: string
  hideLabel?: boolean
  value: string
  onValueChange: (value: string) => void
  options: ReadonlyArray<SelectOption>
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  /** Pesan validasi inline; juga mengaktifkan state error. */
  error?: string
  hint?: string
  emptyMessage?: string
  id?: string
  className?: string
}

/**
 * Dropdown kustom standar (DESIGN.md §16) di atas Radix UI Select.
 * Popup sepenuhnya dirender oleh komponen ini — bukan popup native browser.
 * Satu-satunya file yang boleh mengimpor `@radix-ui/react-select`.
 */
export function AppSelect({
  label,
  hideLabel = false,
  value,
  onValueChange,
  options,
  placeholder = 'Pilih…',
  disabled = false,
  loading = false,
  error,
  hint,
  emptyMessage = 'Tidak ada pilihan.',
  id,
  className,
}: AppSelectProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const errorId = `${fieldId}-error`
  const hintId = `${fieldId}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={fieldId} className={hideLabel ? 'sr-only' : 'text-sm font-medium text-fg-2'}>
        {label}
      </label>
      <Select.Root value={value} onValueChange={onValueChange} disabled={disabled || loading}>
        <Select.Trigger
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-busy={loading || undefined}
          className={cn(
            'focus-ring flex h-11 w-full items-center justify-between gap-2 rounded-ui-md border bg-field px-3.5 text-left text-[15px] text-fg',
            'transition-colors duration-[var(--duration-fast)]',
            error ? 'border-danger' : 'border-line-default hover:border-line-strong',
            'data-[state=open]:border-cyan data-[placeholder]:text-fg-muted disabled:opacity-60',
          )}
        >
          <span className="min-w-0 flex-1 truncate">
            <Select.Value placeholder={placeholder} />
          </span>
          <Select.Icon asChild>
            {loading ? (
              <LoaderCircle aria-hidden className="size-[18px] shrink-0 animate-spin text-fg-muted" />
            ) : (
              <ChevronDown aria-hidden className="size-[18px] shrink-0 text-fg-muted" />
            )}
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            position="popper"
            sideOffset={6}
            collisionPadding={12}
            className={cn(
              'animate-popover z-[var(--z-popover)] overflow-hidden rounded-ui-lg border border-line-default bg-raised shadow-[var(--shadow-popover)]',
              'w-[var(--radix-select-trigger-width)] max-h-[min(var(--radix-select-content-available-height),320px)]',
            )}
          >
            <Select.ScrollUpButton className="flex h-7 items-center justify-center text-fg-muted">
              <ChevronUp aria-hidden className="size-4" />
            </Select.ScrollUpButton>
            <Select.Viewport className="p-1.5">
              {options.length === 0 ? (
                <div role="status" className="px-3 py-3 text-sm text-fg-muted">
                  {emptyMessage}
                </div>
              ) : (
                options.map((option) => (
                  <Select.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className={cn(
                      'relative flex min-h-[38px] cursor-pointer items-center gap-2 rounded-ui-sm px-3 py-2 text-[15px] text-fg-2 outline-none select-none',
                      'data-[highlighted]:bg-panel data-[highlighted]:text-fg',
                      'data-[state=checked]:text-fg data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
                    )}
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <Select.ItemText>{option.label}</Select.ItemText>
                      {option.description ? (
                        <span className="text-xs text-fg-muted">{option.description}</span>
                      ) : null}
                    </span>
                    <Select.ItemIndicator className="shrink-0 text-cyan">
                      <Check aria-hidden className="size-4" />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))
              )}
            </Select.Viewport>
            <Select.ScrollDownButton className="flex h-7 items-center justify-center text-fg-muted">
              <ChevronDown aria-hidden className="size-4" />
            </Select.ScrollDownButton>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      {hint ? (
        <p id={hintId} className="text-xs text-fg-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
