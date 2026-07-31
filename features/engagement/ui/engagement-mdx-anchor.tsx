'use client'

import type { MouseEvent } from 'react'
import { commitEngagementEvent } from '@/features/engagement/api/commit-engagement-event'
import { ENGAGEMENT } from '@/features/engagement/config/constants'
import { MdxAnchor } from '@/shared/ui/mdx-anchor'

interface EngagementMdxAnchorProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children?: React.ReactNode
}

export function EngagementMdxAnchor({
  children,
  href,
  onClick,
  ...anchorProps
}: EngagementMdxAnchorProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)

    if (!event.defaultPrevented && href?.toLowerCase().startsWith('mailto:')) {
      void commitEngagementEvent({
        eventName: ENGAGEMENT.EVENT_NAME.CONTACT_CLICK,
        targetKind: ENGAGEMENT.TARGET_KIND.EMAIL,
      }).catch(() => null)
    }
  }

  return (
    <MdxAnchor {...anchorProps} href={href} onClick={handleClick}>
      {children}
    </MdxAnchor>
  )
}
