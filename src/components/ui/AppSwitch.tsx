import * as Switch from '@radix-ui/react-switch'
import { useId } from 'react'
import { cn } from '@/lib/cn'

/** Saklar on/off berlabel (Radix Switch) — bukan checkbox native. */
export function AppSwitch({
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
}: {
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}) {
  const id = useId()
  const descId = `${id}-desc`
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className={cn('text-[15px] font-medium text-fg', disabled && 'opacity-60')}>
          {label}
        </label>
        {description ? (
          <p id={descId} className="mt-0.5 text-sm text-fg-muted">
            {description}
          </p>
        ) : null}
      </div>
      <Switch.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-describedby={description ? descId : undefined}
        className={cn(
          'focus-ring relative h-6 w-11 shrink-0 rounded-full border border-line-default transition-colors duration-[var(--duration-fast)]',
          'data-[state=checked]:border-transparent data-[state=checked]:bg-blue data-[state=unchecked]:bg-field disabled:opacity-60',
        )}
      >
        <Switch.Thumb className="block size-[18px] translate-x-[3px] rounded-full bg-fg transition-transform duration-[var(--duration-fast)] data-[state=checked]:translate-x-[23px]" />
      </Switch.Root>
    </div>
  )
}
