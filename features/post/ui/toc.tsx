'use client'

import { motion, useReducedMotion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { POST_TOC } from '@/features/post/config/constants'
import {
  buildTocContainerVariants,
  calcTocHeadingIndent,
  calcTocScrollTargetTop,
} from '@/features/post/lib/toc-motion'
import { cn } from '@/shared/lib/utils'
import type { TocHeading } from '@/shared/lib/toc'

interface TocProps {
  headings: TocHeading[]
  className?: string
}

export function Toc({ headings, className }: TocProps) {
  const t = useTranslations('post.toc')
  const [activeId, setActiveId] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shouldReduceMotion = Boolean(useReducedMotion())
  const tocContainerVariants = buildTocContainerVariants(shouldReduceMotion)

  useEffect(() => {
    const handleScroll = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        let currentId: string | null = null

        for (let i = headings.length - 1; i >= 0; i--) {
          const heading = headings[i]
          const element = document.querySelector(`#${heading.slug}`)
          if (element) {
            const rect = element.getBoundingClientRect()
            if (rect.top <= POST_TOC.ACTIVE_HEADING_TOP_OFFSET_PX) {
              currentId = heading.slug
              break
            }
          }
        }
        setActiveId(currentId)
      }, POST_TOC.SCROLL_DEBOUNCE_MILLISECONDS)
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [headings])

  const handleClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    slug: string,
  ) => {
    e.preventDefault()
    const element = document.querySelector(`#${slug}`)
    if (element) {
      const rect = element.getBoundingClientRect()
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const targetTop = calcTocScrollTargetTop(rect.top, scrollTop)
      window.scrollTo({
        top: targetTop,
        behavior: 'smooth',
      })
    }
    setActiveId(slug)
  }

  if (headings.length === 0) {
    return null
  }

  return (
    <motion.nav
      className={className}
      variants={tocContainerVariants}
      initial="hidden"
      animate="visible"
    >
      <h2 className="mb-2 font-semibold">{t('title')}</h2>
      <ul className="space-y-2">
        {headings.map((heading) => {
          const isActive = activeId === heading.slug

          return (
            <li
              key={heading.slug}
              style={{ paddingLeft: calcTocHeadingIndent(heading.depth) }}
            >
              <a
                href={`#${heading.slug}`}
                onClick={(e) => handleClick(e, heading.slug)}
                className={cn(
                  'group relative flex items-center gap-2 rounded-md py-1 text-sm transition-colors',
                  isActive
                    ? 'text-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span className="relative flex size-3 shrink-0 items-center justify-center">
                  {isActive ? (
                    <motion.span
                      layoutId={POST_TOC.MOTION.ACTIVE_INDICATOR_LAYOUT_ID}
                      className="bg-foreground absolute h-3 w-1.5 rounded-full"
                    />
                  ) : (
                    <span className="bg-border group-hover:bg-foreground/50 h-1.5 w-1.5 rounded-full transition-colors" />
                  )}
                </span>
                <span className="min-w-0 truncate">{heading.text}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </motion.nav>
  )
}
