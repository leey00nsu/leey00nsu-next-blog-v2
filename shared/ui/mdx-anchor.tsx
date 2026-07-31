import { LinkIcon } from 'lucide-react'
import type React from 'react'
import { cn } from '@/shared/lib/utils'

const MDX_ANCHOR_ICON_SIZE = 14
const MDX_ANCHOR_ICON_STROKE_WIDTH = 2.25

const MDX_ANCHOR_CLASS_NAME =
  'inline box-decoration-clone rounded-sm bg-sky-50 px-1 py-0.5 font-semibold text-sky-700 !underline decoration-sky-400/80 decoration-2 underline-offset-4 transition-colors hover:bg-sky-100 hover:text-sky-900 hover:decoration-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:bg-sky-950/50 dark:text-sky-200 dark:decoration-sky-400/80 dark:hover:bg-sky-900/70 dark:hover:text-sky-100'

const MDX_ANCHOR_ICON_CLASS_NAME =
  'ml-1 inline-block align-[-0.125em] text-sky-600 dark:text-sky-300'

interface MdxAnchorProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children?: React.ReactNode
}

export function MdxAnchor({
  children,
  className,
  ...anchorProps
}: MdxAnchorProps) {
  return (
    <a {...anchorProps} className={cn(MDX_ANCHOR_CLASS_NAME, className)}>
      {children}
      <LinkIcon
        aria-hidden="true"
        className={MDX_ANCHOR_ICON_CLASS_NAME}
        size={MDX_ANCHOR_ICON_SIZE}
        strokeWidth={MDX_ANCHOR_ICON_STROKE_WIDTH}
      />
    </a>
  )
}
