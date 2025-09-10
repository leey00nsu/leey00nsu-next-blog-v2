// Studio feature 공통 상수(그룹)

export const STUDIO = {
  // 슬러그 입력 디바운스(ms)
  SLUG_DEBOUNCE_MS: 200,
  // 커밋 FormData 필드 키
  COMMIT_FIELDS: {
    SLUG: 'slug',
    MDX: 'mdx',
    IMAGE_PATHS: 'paths',
    IMAGES: 'images',
  } as const,
} as const
