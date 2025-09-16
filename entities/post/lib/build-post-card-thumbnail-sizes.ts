import { BREAKPOINTS } from '@/shared/config/constants'
import { POST_CARD_THUMBNAIL } from '@/entities/post/config/post-card'

export function buildPostCardThumbnailSizes(): string {
  return `
    (max-width: ${BREAKPOINTS.TABLET}px) ${POST_CARD_THUMBNAIL.MOBILE_WIDTH_RATIO},
    ${POST_CARD_THUMBNAIL.DESKTOP_WIDTH}px
  `
    .replaceAll(/\s+/g, ' ')
    .trim()
}
