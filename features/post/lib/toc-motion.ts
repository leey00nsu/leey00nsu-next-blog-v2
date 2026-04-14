import type { Variants } from 'motion/react'
import { POST_TOC } from '@/features/post/config/constants'
import type { TocHeading } from '@/shared/lib/toc'

interface ResolveActiveTocHeadingIdParams {
  headings: TocHeading[]
  activeBoundaryHeadingSlugSet: Set<string>
  visibleHeadingSlugSet: Set<string>
  currentActiveHeadingSlug: string | null
  isNearBottom: boolean
}

export function buildTocContainerVariants(
  shouldReduceMotion: boolean,
): Variants {
  if (shouldReduceMotion) {
    return {
      hidden: {
        opacity: 1,
        y: 0,
      },
      visible: {
        opacity: 1,
        y: 0,
      },
    }
  }

  return {
    hidden: {
      opacity: 0,
      y: POST_TOC.MOTION.ENTER_OFFSET_Y,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: POST_TOC.MOTION.ENTER_DURATION_SECONDS,
        ease: POST_TOC.MOTION.EASE,
      },
    },
  }
}

export function calcTocHeadingIndent(depth: number): string {
  const depthOffset = Math.max(depth - POST_TOC.BASE_HEADING_DEPTH, 0)

  return `${depthOffset * POST_TOC.INDENT_STEP_REM}rem`
}

export function calcTocScrollTargetTop(
  headingRectTop: number,
  scrollTop: number,
): number {
  return (
    headingRectTop + scrollTop - POST_TOC.ACTIVE_HEADING_TOP_OFFSET_PX
  )
}

export function calcTocActiveBoundaryRootMargin(
  viewportHeight: number,
): string {
  const bottomBoundaryHeight = Math.max(
    viewportHeight * POST_TOC.ACTIVE_REGION_HEIGHT_RATIO,
    0,
  )

  return `-${POST_TOC.ACTIVE_HEADING_TOP_OFFSET_PX}px 0px -${bottomBoundaryHeight}px 0px`
}

export function isTocScrollNearBottom(
  scrollTop: number,
  viewportHeight: number,
  documentHeight: number,
): boolean {
  return (
    scrollTop + viewportHeight >=
    documentHeight - POST_TOC.ACTIVE_HEADING_TOLERANCE_PX
  )
}

export function resolveActiveTocHeadingId({
  headings,
  activeBoundaryHeadingSlugSet,
  visibleHeadingSlugSet,
  currentActiveHeadingSlug,
  isNearBottom,
}: ResolveActiveTocHeadingIdParams): string | null {
  if (isNearBottom) {
    const visibleHeadings = headings.filter((heading) =>
      visibleHeadingSlugSet.has(heading.slug),
    )

    if (visibleHeadings.length > 0) {
      return visibleHeadings.at(-1)?.slug ?? null
    }
  }

  const activeBoundaryHeadings = headings.filter((heading) =>
    activeBoundaryHeadingSlugSet.has(heading.slug),
  )

  if (activeBoundaryHeadings.length > 0) {
    return activeBoundaryHeadings.at(-1)?.slug ?? null
  }

  if (
    currentActiveHeadingSlug &&
    visibleHeadingSlugSet.has(currentActiveHeadingSlug)
  ) {
    return currentActiveHeadingSlug
  }

  const visibleHeadings = headings.filter((heading) =>
    visibleHeadingSlugSet.has(heading.slug),
  )

  if (visibleHeadings.length === 1) {
    return visibleHeadings[0]?.slug ?? null
  }

  return headings[0]?.slug ?? null
}
