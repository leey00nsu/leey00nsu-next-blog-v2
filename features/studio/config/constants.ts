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
    SOURCE_LOCALE: 'sourceLocale',
    TARGET_LOCALES: 'targetLocales',
  } as const,
} as const

// Studio 커밋 관련 기본 상수
export const COMMIT = {
  DEFAULT_MESSAGE: 'docs: 새 글 추가',
} as const
