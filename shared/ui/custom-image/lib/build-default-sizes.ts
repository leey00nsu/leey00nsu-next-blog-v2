import { BREAKPOINTS, IMAGE } from '@/shared/config/constants'

export function buildDefaultSizes(width?: number): string {
  // prose 영역 최대 너비로 제한하여 불필요한 대용량 이미지 요청 방지
  const maxWidth = IMAGE.MAX_RENDER_WIDTH
  const clampedWidth = width ? Math.min(width, maxWidth) : maxWidth

  return `(min-width: ${BREAKPOINTS.DESKTOP}px) ${clampedWidth}px, min(100vw, ${maxWidth}px)`
}
