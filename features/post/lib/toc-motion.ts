import type { Variants } from 'motion/react'
import { POST_TOC } from '@/features/post/config/constants'

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
