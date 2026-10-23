import { useId, type ComponentProps } from 'react'
import { cn } from '@/lib/cn'

/** Field teks bergaya token (setara trigger AppSelect), dengan label, hint, dan error inline. */
export function TextField({
  label,
  hint,
  error,
  className,
  id,
  ...rest
}: Omit<ComponentProps<'input'>, 'children'> & { label: string; hint?: string; error?: string }) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const hintId = `${fieldId}-hint`
  const errorId = `${fieldId}-error`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={fieldId} className="text-sm font-medium text-fg-2">
        {label}
      </label>
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'focus-ring h-11 w-full rounded-ui-md border bg-field px-3.5 text-[15px] text-fg placeholder:text-fg-muted',
          'transition-colors duration-[var(--duration-fast)] disabled:opacity-60',
          error ? 'border-danger' : 'border-line-default hover:border-line-strong focus:border-cyan',
        )}
        {...rest}
      />
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
