import { ExternalLink as ExternalLinkIcon } from 'lucide-react'
import type { MouseEvent, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { isSafeExternalUrl, openExternal } from '@/lib/external'

/** Tautan eksternal: jelas sebagai eksternal, hanya https, lewat `openExternal`. */
export function ExternalLink({
  href,
  children,
  className,
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  const safe = isSafeExternalUrl(href)
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    openExternal(href)
  }
  return (
    <a
      href={safe ? href : undefined}
      onClick={onClick}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'focus-ring inline-flex items-center gap-1.5 rounded-ui-sm font-medium text-cyan underline-offset-4 hover:underline',
        className,
      )}
    >
      {children}
      <ExternalLinkIcon aria-hidden className="size-3.5" />
      <span className="sr-only"> (tautan eksternal, membuka di browser)</span>
    </a>
  )
}
