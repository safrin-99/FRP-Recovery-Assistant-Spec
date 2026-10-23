import { ExternalLink as ExternalLinkIcon } from 'lucide-react'
import type { MouseEvent, ReactNode } from 'react'
import type { OfficialLink } from '@/data/catalog'
import { cn } from '@/lib/cn'
import { isSafeExternalUrl, openOfficialLink } from '@/lib/external'

/**
 * Tautan resmi: jelas sebagai eksternal dan dibuka di browser default. Di aplikasi desktop
 * hanya ID tautan yang dikirim ke backend (URL ditentukan backend).
 */
export function ExternalLink({
  link,
  children,
  className,
}: {
  link: OfficialLink
  children?: ReactNode
  className?: string
}) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    void openOfficialLink(link)
  }
  return (
    <a
      href={isSafeExternalUrl(link.url) ? link.url : undefined}
      onClick={onClick}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'focus-ring inline-flex items-center gap-1.5 rounded-ui-sm font-medium text-cyan underline-offset-4 hover:underline',
        className,
      )}
    >
      {children ?? link.label}
      <ExternalLinkIcon aria-hidden className="size-3.5" />
      <span className="sr-only"> (tautan eksternal, membuka di browser)</span>
    </a>
  )
}
