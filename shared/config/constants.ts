import { Route } from 'next'

// 파일시스템/URL 경로 상수
export const PATHS = {
  FS: {
    PUBLIC_DIR: 'public',
    PUBLIC_POSTS_DIR: 'public/posts',
    ABOUT_MDX_BASENAME: 'public/about/about',
    IMAGE_CACHE_DIR: '.next/cache/gif-webp',
  },
  URL: {
    // URL 기준(마크다운/이미지 경로에 쓰이는 접두사)
    PUBLIC_POSTS_BASE: '/public/posts',
  },
} as const

// Locale 설정
export const LOCALES = {
  SUPPORTED: ['ko', 'en'] as const,
  DEFAULT: 'ko' as const,
}

export type SupportedLocale = (typeof LOCALES.SUPPORTED)[number]

// 경로 빌더
export function buildPostMdxRelativePath(slug: string): string {
  return `${PATHS.FS.PUBLIC_POSTS_DIR}/${slug}/${slug}.mdx`
}

export function buildPostMdxRelativePathLocalized(
  slug: string,
  locale: SupportedLocale,
): string {
  return `${PATHS.FS.PUBLIC_POSTS_DIR}/${slug}/${slug}.${locale}.mdx`
}

export function buildAboutMdxAbsolutePath(): string {
  return `${PATHS.FS.ABOUT_MDX_BASENAME}.mdx`
}

export function buildAboutMdxAbsolutePathLocalized(
  locale: SupportedLocale,
): string {
  return `${PATHS.FS.ABOUT_MDX_BASENAME}.${locale}.mdx`
}

// 라우트/URL 관련 상수
export const ROUTES = {
  BLOG: '/blog' as Route,
  ABOUT: '/about' as Route,
  STUDIO: '/studio' as Route,
  AUTH_SIGNIN: '/auth/signin' as Route,
  API: {
    STUDIO_COMMIT: '/api/studio/commit' as Route,
  },
} as const

// 태그 관련 쿼리스트링 키
export const DEFAULT_TAG_QUERY_KEY = 'tag'

// 경로 빌더
export function buildBlogPostHref(slug: string): Route {
  return `${ROUTES.BLOG}/${slug}` as Route
}

export function buildBlogOgImagePath(slug: string): Route {
  return `${ROUTES.BLOG}/${slug}/opengraph-image` as Route
}

export function buildBlogTagHref(tag: string): Route {
  const searchParams = new URLSearchParams([[DEFAULT_TAG_QUERY_KEY, tag]])
  return `${ROUTES.BLOG}?${searchParams.toString()}`
}

export const SITE = {
  NAME: 'leey00nsu 블로그',
  DEFAULT_DESCRIPTION: 'leey00nsu 블로그',
} as const

export const TAG = {
  SUGGESTION_LIMIT: 20,
} as const

// 테마 관련 상수
// 이미지 최적화 관련 상수
export const IMAGE = {
  // webp 품질(0-100)
  DEFAULT_QUALITY: 75,
  // 캐시: TTL 우선 immutable
  CACHE_CONTROL: 'public, max-age=60, must-revalidate',
} as const

// MDX / Frontmatter 관련 정규식
// 문서 선두의 frontmatter 블록을 제거하기 위한 패턴
export const FRONTMATTER_BLOCK_REGEX = /^---[\s\S]*?---\n?/
