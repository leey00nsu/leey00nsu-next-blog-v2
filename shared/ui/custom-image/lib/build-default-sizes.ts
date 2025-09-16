import { BREAKPOINTS, IMAGE } from '@/shared/config/constants'
import { CUSTOM_IMAGE_SIZES } from '@/shared/ui/custom-image/config/constants'

export function buildDefaultSizes(width?: number): string {
  if (!width) {
    return CUSTOM_IMAGE_SIZES.MOBILE
  }

  const clampedWidth = Math.min(width, IMAGE.MAX_RENDER_WIDTH)
  return `
    (min-width: ${BREAKPOINTS.DESKTOP}px) ${clampedWidth}px,
    ${CUSTOM_IMAGE_SIZES.MOBILE}
  `
    .replaceAll(/\s+/g, ' ')
    .trim()
}
