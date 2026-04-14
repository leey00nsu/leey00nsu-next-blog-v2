import { BREAKPOINTS } from '@/shared/config/constants'

export const POST_TAG_FILTER = {
  COLLAPSED_ROW_COUNT: {
    MOBILE: 2,
    DESKTOP: 2,
  },
  DESKTOP_MEDIA_QUERY: `(min-width: ${BREAKPOINTS.DESKTOP}px)`,
  ROW_OFFSET_TOLERANCE_PX: 1,
} as const

export const POST_TOC = {
  ACTIVE_HEADING_TOP_OFFSET_PX: 64,
  ACTIVE_HEADING_TOLERANCE_PX: 4,
  ACTIVE_REGION_HEIGHT_RATIO: 0.4,
  BASE_HEADING_DEPTH: 2,
  INDENT_STEP_REM: 1,
  MOTION: {
    ACTIVE_INDICATOR_LAYOUT_ID: 'post-toc-active-indicator',
    ENTER_OFFSET_Y: 12,
    ENTER_DURATION_SECONDS: 0.24,
    EASE: [0.22, 1, 0.36, 1],
  },
} as const
