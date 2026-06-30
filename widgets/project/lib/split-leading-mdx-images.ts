const LEADING_MDX_IMAGE_BLOCK_REGEX = /^(?:\s*!\[[^\]]*]\([^)]+\)\s*)+/
const MDX_IMAGE_MARKDOWN_REGEX = /!\[[^\]]*]\([^)]+\)/g

interface SplitLeadingMdxImagesResult {
  firstImageContent: string | null
  remainingContent: string
}

interface SplitLeadingMdxImagesOptions {
  preserveRemainingLeadingImages?: boolean
}

const DEFAULT_SPLIT_LEADING_MDX_IMAGES_OPTIONS = {
  preserveRemainingLeadingImages: true,
} as const

export function splitLeadingMdxImages(
  content: string,
  options: SplitLeadingMdxImagesOptions = DEFAULT_SPLIT_LEADING_MDX_IMAGES_OPTIONS,
): SplitLeadingMdxImagesResult {
  const leadingImageBlockMatch = content.match(LEADING_MDX_IMAGE_BLOCK_REGEX)

  if (!leadingImageBlockMatch) {
    return {
      firstImageContent: null,
      remainingContent: content,
    }
  }

  const leadingImageBlock = leadingImageBlockMatch[0]
  const imageMarkdowns = leadingImageBlock.match(MDX_IMAGE_MARKDOWN_REGEX) ?? []

  if (imageMarkdowns.length === 0) {
    return {
      firstImageContent: null,
      remainingContent: content,
    }
  }

  const firstImageContent = imageMarkdowns[0]

  if (!firstImageContent) {
    return {
      firstImageContent: null,
      remainingContent: content,
    }
  }

  const shouldPreserveRemainingLeadingImages =
    options.preserveRemainingLeadingImages ??
    DEFAULT_SPLIT_LEADING_MDX_IMAGES_OPTIONS.preserveRemainingLeadingImages
  const remainingLeadingImages = shouldPreserveRemainingLeadingImages
    ? imageMarkdowns.slice(1).join('\n\n')
    : ''
  const contentAfterLeadingImages = content
    .slice(leadingImageBlock.length)
    .trimStart()
  const remainingContentParts = [
    remainingLeadingImages,
    contentAfterLeadingImages,
  ].filter(Boolean)

  return {
    firstImageContent,
    remainingContent: remainingContentParts.join('\n\n'),
  }
}
