import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 px-4 py-6 text-center', className)}>
      <span className="grid size-11 place-items-center rounded-full border border-line-default bg-field text-fg-muted">
        <Icon aria-hidden className="size-5" />
      </span>
      <p className="text-[15px] font-semibold text-fg">{title}</p>
      {description ? <p className="max-w-[34ch] text-sm leading-snug text-fg-muted">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}
