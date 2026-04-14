'use client'

import { motion, useReducedMotion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { POST_TOC } from '@/features/post/config/constants'
import {
  buildTocContainerVariants,
  calcTocActiveBoundaryRootMargin,
  calcTocHeadingIndent,
  calcTocScrollTargetTop,
  isTocScrollNearBottom,
  resolveActiveTocHeadingId,
} from '@/features/post/lib/toc-motion'
import { cn } from '@/shared/lib/utils'
import type { TocHeading } from '@/shared/lib/toc'

interface TocProps {
  headings: TocHeading[]
  className?: string
}

const TOC_MANUAL_SCROLL_KEYS = new Set([
  'ArrowDown',
  'ArrowUp',
  'PageDown',
  'PageUp',
  'Home',
  'End',
  ' ',
])

function queryTocHeadingElement(slug: string): Element | null {
  return document.querySelector(`#${CSS.escape(slug)}`)
}

export function Toc({ headings, className }: TocProps) {
  const t = useTranslations('post.toc')
  const tocInstanceId = useId()
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeHeadingSlugReference = useRef<string | null>(null)
  const lockedActiveHeadingSlugReference = useRef<string | null>(null)
  const activeBoundaryHeadingSlugSetReference = useRef<Set<string>>(new Set())
  const visibleHeadingSlugSetReference = useRef<Set<string>>(new Set())
  const shouldReduceMotion = Boolean(useReducedMotion())
  const tocContainerVariants = buildTocContainerVariants(shouldReduceMotion)
  const activeIndicatorLayoutId = `${POST_TOC.MOTION.ACTIVE_INDICATOR_LAYOUT_ID}-${tocInstanceId}`

  useEffect(() => {
    activeHeadingSlugReference.current = activeId
  }, [activeId])

  const updateActiveHeading = useCallback(() => {
    const lockedActiveHeadingSlug = lockedActiveHeadingSlugReference.current
    const scrollTop = window.scrollY || document.documentElement.scrollTop
    const viewportHeight = window.innerHeight
    const documentHeight = document.documentElement.scrollHeight
    const nearBottom = isTocScrollNearBottom(
      scrollTop,
      viewportHeight,
      documentHeight,
    )

    if (lockedActiveHeadingSlug) {
      setActiveId(lockedActiveHeadingSlug)
      return
    }

    setActiveId(
      resolveActiveTocHeadingId({
        headings,
        activeBoundaryHeadingSlugSet:
          activeBoundaryHeadingSlugSetReference.current,
        visibleHeadingSlugSet: visibleHeadingSlugSetReference.current,
        currentActiveHeadingSlug: activeHeadingSlugReference.current,
        isNearBottom: nearBottom,
      }),
    )
  }, [headings])

  const releaseLockedActiveHeading = useCallback(() => {
    if (!lockedActiveHeadingSlugReference.current) {
      return
    }

    lockedActiveHeadingSlugReference.current = null
    updateActiveHeading()
  }, [updateActiveHeading])

  useEffect(() => {
    const syncObservedHeadingSlugSet = (
      entries: IntersectionObserverEntry[],
      observedHeadingSlugSet: Set<string>,
    ) => {
      for (const entry of entries) {
        const headingSlug = entry.target.id

        if (!headingSlug) {
          continue
        }

        if (entry.isIntersecting) {
          observedHeadingSlugSet.add(headingSlug)
          continue
        }

        observedHeadingSlugSet.delete(headingSlug)
      }
    }

    let activeBoundaryObserver: IntersectionObserver | null = null
    let visibleHeadingObserver: IntersectionObserver | null = null

    const observeHeadings = () => {
      activeBoundaryObserver?.disconnect()
      visibleHeadingObserver?.disconnect()
      activeBoundaryHeadingSlugSetReference.current.clear()
      visibleHeadingSlugSetReference.current.clear()

      activeBoundaryObserver = new IntersectionObserver(
        (entries) => {
          syncObservedHeadingSlugSet(
            entries,
            activeBoundaryHeadingSlugSetReference.current,
          )
          updateActiveHeading()
        },
        {
          rootMargin: calcTocActiveBoundaryRootMargin(window.innerHeight),
          threshold: 0,
        },
      )

      visibleHeadingObserver = new IntersectionObserver(
        (entries) => {
          syncObservedHeadingSlugSet(
            entries,
            visibleHeadingSlugSetReference.current,
          )
          updateActiveHeading()
        },
        {
          threshold: 0,
        },
      )

      for (const heading of headings) {
        const headingElement = queryTocHeadingElement(heading.slug)

        if (!headingElement) {
          continue
        }

        activeBoundaryObserver.observe(headingElement)
        visibleHeadingObserver.observe(headingElement)
      }

      updateActiveHeading()
    }

    const handleResize = () => {
      observeHeadings()
    }

    observeHeadings()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      activeBoundaryObserver?.disconnect()
      visibleHeadingObserver?.disconnect()
    }
  }, [headings, updateActiveHeading])

  useEffect(() => {
    const handleWheel = () => {
      releaseLockedActiveHeading()
    }

    const handleTouchMove = () => {
      releaseLockedActiveHeading()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (TOC_MANUAL_SCROLL_KEYS.has(event.key)) {
        releaseLockedActiveHeading()
      }
    }

    globalThis.addEventListener('wheel', handleWheel, { passive: true })
    globalThis.addEventListener('touchmove', handleTouchMove, { passive: true })
    globalThis.addEventListener('keydown', handleKeyDown)

    return () => {
      globalThis.removeEventListener('wheel', handleWheel)
      globalThis.removeEventListener('touchmove', handleTouchMove)
      globalThis.removeEventListener('keydown', handleKeyDown)
    }
  }, [releaseLockedActiveHeading])

  const handleClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    slug: string,
  ) => {
    e.preventDefault()
    const element = queryTocHeadingElement(slug)
    if (element) {
      const rect = element.getBoundingClientRect()
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const targetTop = calcTocScrollTargetTop(rect.top, scrollTop)
      window.scrollTo({
        top: targetTop,
        behavior: 'smooth',
      })
    }
    lockedActiveHeadingSlugReference.current = slug
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
                      layoutId={activeIndicatorLayoutId}
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
