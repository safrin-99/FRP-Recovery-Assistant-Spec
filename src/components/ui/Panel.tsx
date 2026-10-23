import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

/** Permukaan panel standar: bg-panel, border halus, radius moderat (DESIGN.md §1). */
export function Panel({ className, ...rest }: ComponentProps<'section'>) {
  return <section className={cn('rounded-ui-lg border border-line bg-panel', className)} {...rest} />
}
