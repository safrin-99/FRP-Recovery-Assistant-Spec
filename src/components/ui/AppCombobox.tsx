import * as Popover from '@radix-ui/react-popover'
import { Command } from 'cmdk'
import { Check, ChevronDown, LoaderCircle, Search, X } from 'lucide-react'
import { useId, useState } from 'react'
import { cn } from '@/lib/cn'
import type { SelectOption } from './AppSelect'

export interface AppComboboxProps {
  label: string
  hideLabel?: boolean
  /** Nilai terpilih; string kosong = belum ada pilihan. */
  value: string
  onValueChange: (value: string) => void
  options: ReadonlyArray<SelectOption>
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  clearable?: boolean
  disabled?: boolean
  loading?: boolean
  error?: string
  hint?: string
  id?: string
  className?: string
}

/**
 * Pilihan dengan pencarian (DESIGN.md §16): Radix Popover + cmdk. Input, daftar hasil,
 * empty state, dan tombol clear semuanya kustom — tanpa `<datalist>`/`<select>`.
 */
export function AppCombobox({
  label,
  hideLabel = false,
  value,
  onValueChange,
  options,
  placeholder = 'Pilih…',
  searchPlaceholder = 'Cari…',
  emptyMessage = 'Tidak ada hasil.',
  clearable = true,
  disabled = false,
  loading = false,
  error,
  hint,
  id,
  className,
}: AppComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const autoId = useId()
  const fieldId = id ?? autoId
  const listId = `${fieldId}-list`
  const errorId = `${fieldId}-error`
  const hintId = `${fieldId}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
  const selected = options.find((option) => option.value === value)
  const showClear = clearable && value !== '' && !disabled && !loading

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) setSearch('')
  }

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={fieldId} className={hideLabel ? 'sr-only' : 'text-sm font-medium text-fg-2'}>
        {label}
      </label>
      <Popover.Root open={open} onOpenChange={handleOpenChange}>
        <div className="relative">
          <Popover.Trigger asChild>
            <button
              id={fieldId}
              type="button"
              disabled={disabled || loading}
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-controls={listId}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
              aria-busy={loading || undefined}
              className={cn(
                'focus-ring flex h-11 w-full items-center justify-between gap-2 rounded-ui-md border bg-field pr-3.5 pl-3.5 text-left text-[15px]',
                'transition-colors duration-[var(--duration-fast)] disabled:opacity-60',
                showClear && 'pr-16',
                error ? 'border-danger' : 'border-line-default hover:border-line-strong',
                open && 'border-cyan',
                selected ? 'text-fg' : 'text-fg-muted',
              )}
            >
              <span className="min-w-0 flex-1 truncate">{selected ? selected.label : placeholder}</span>
              {loading ? (
                <LoaderCircle aria-hidden className="size-[18px] shrink-0 animate-spin text-fg-muted" />
              ) : (
                <ChevronDown aria-hidden className="size-[18px] shrink-0 text-fg-muted" />
              )}
            </button>
          </Popover.Trigger>
          {showClear ? (
            <button
              type="button"
              aria-label={`Hapus pilihan ${label}`}
              onClick={() => onValueChange('')}
              className="focus-ring absolute top-1/2 right-9 grid size-7 -translate-y-1/2 place-items-center rounded-ui-sm text-fg-muted hover:bg-raised hover:text-fg"
            >
              <X aria-hidden className="size-4" />
            </button>
          ) : null}
        </div>
        <Popover.Portal>
          <Popover.Content
            sideOffset={6}
            align="start"
            collisionPadding={12}
            className={cn(
              'animate-popover z-[var(--z-popover)] overflow-hidden rounded-ui-lg border border-line-default bg-raised shadow-[var(--shadow-popover)]',
              'w-[var(--radix-popover-trigger-width)] max-h-[min(var(--radix-popover-content-available-height),360px)]',
            )}
          >
            {/* cmdk menamai input lewat aria-labelledby ke label Command ini. */}
            <Command label={`Cari ${label}`} loop>
              <div className="flex items-center gap-2 border-b border-line-default px-3">
                <Search aria-hidden className="size-4 shrink-0 text-fg-muted" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder={searchPlaceholder}
                  className="h-11 w-full bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-muted"
                />
              </div>
              <Command.List id={listId} className="max-h-64 overflow-y-auto p-1.5">
                <Command.Empty className="px-3 py-3 text-sm text-fg-muted">{emptyMessage}</Command.Empty>
                {options.map((option) => (
                  <Command.Item
                    key={option.value}
                    value={option.label}
                    keywords={option.description ? [option.description] : undefined}
                    disabled={option.disabled}
                    onSelect={() => {
                      onValueChange(option.value)
                      handleOpenChange(false)
                    }}
                    className={cn(
                      'flex min-h-[38px] cursor-pointer items-center gap-2 rounded-ui-sm px-3 py-2 text-[15px] text-fg-2 select-none',
                      'data-[selected=true]:bg-panel data-[selected=true]:text-fg',
                      'data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50',
                    )}
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span>{option.label}</span>
                      {option.description ? <span className="text-xs text-fg-muted">{option.description}</span> : null}
                    </span>
                    {option.value === value ? (
                      <>
                        <Check aria-hidden className="size-4 shrink-0 text-cyan" />
                        <span className="sr-only">(dipilih)</span>
                      </>
                    ) : null}
                  </Command.Item>
                ))}
              </Command.List>
            </Command>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
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
