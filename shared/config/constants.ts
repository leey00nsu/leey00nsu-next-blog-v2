import { Route } from 'next'

// 파일시스템/URL 경로 상수
export const PATHS = {
  FS: {
    PUBLIC_DIR: 'public',
    PUBLIC_POSTS_DIR: 'public/posts',
    PUBLIC_PROJECTS_DIR: 'public/projects',
    ABOUT_MDX_BASENAME: 'public/about/about',
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

export const BREAKPOINTS = {
  TABLET: 768,
  DESKTOP: 1024,
} as const

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

export function buildProjectMdxRelativePath(slug: string): string {
  return `${PATHS.FS.PUBLIC_PROJECTS_DIR}/${slug}/${slug}.mdx`
}

export function buildProjectMdxRelativePathLocalized(
  slug: string,
  locale: SupportedLocale,
): string {
  return `${PATHS.FS.PUBLIC_PROJECTS_DIR}/${slug}/${slug}.${locale}.mdx`
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
  ROOT: '/' as Route,
  BLOG: '/blog' as Route,
  ABOUT: '/about' as Route,
  PROJECTS: '/projects' as Route,
  STUDIO: '/studio' as Route,
  PLAYGROUND: '/playground' as Route,
  AUTH_SIGNIN: '/auth/signin' as Route,
  AUTH_UNAUTHORIZED: '/auth/unauthorized' as Route,
  API: {
    STUDIO_COMMIT: '/api/studio/commit' as Route,
    STUDIO_SAVE_LOCAL: '/api/studio/save-local' as Route,
  },
} as const

export const PDF = {
  DOCUMENT_KIND: {
    RESUME: 'resume',
    PORTFOLIO: 'portfolio',
  },
  API_ROUTE: {
    RESUME: '/api/pdf/resume' as Route,
    PORTFOLIO: '/api/pdf/portfolio' as Route,
  },
  PRINT_ROUTE: {
    RESUME: '/print/resume' as Route,
    PORTFOLIO: '/print/portfolio' as Route,
  },
  FILE_EXTENSION: 'pdf',
} as const

export type PdfDocumentKind = (typeof PDF.DOCUMENT_KIND)[keyof typeof PDF.DOCUMENT_KIND]

export function buildPdfFileName(
  documentKind: PdfDocumentKind,
  locale: SupportedLocale,
): string {
  return `${documentKind}-${locale}.${PDF.FILE_EXTENSION}`
}

// 태그 관련 쿼리스트링 키
export const DEFAULT_TAG_QUERY_KEY = 'tag'

function normalizeLocalePath(pathname: string): string {
  if (!pathname.startsWith('/')) {
    return `/${pathname}`
  }

  if (pathname === ROUTES.ROOT) {
    return ROUTES.ROOT
  }

  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
}

export function buildLocalizedRoutePath(
  pathname: string,
  locale: SupportedLocale,
): Route {
  const normalizedPathname = normalizeLocalePath(pathname)

  if (normalizedPathname === ROUTES.ROOT) {
    return `/${locale}` as Route
  }

  return `/${locale}${normalizedPathname}` as Route
}

export function stripLocalePrefix(pathname: string): string {
  const normalizedPathname = normalizeLocalePath(pathname)
  const localePrefixPattern = /^\/(ko|en)(\/|$)/
  return normalizedPathname.replace(localePrefixPattern, '/') || ROUTES.ROOT
}

// 경로 빌더
export function buildBlogPostHref(
  slug: string,
  locale?: SupportedLocale,
): Route {
  const path = `${ROUTES.BLOG}/${slug}` as Route
  if (!locale) {
    return path
  }
  return buildLocalizedRoutePath(path, locale)
}

export function buildBlogOgImagePath(
  slug: string,
  locale?: SupportedLocale,
): Route {
  const path = `${ROUTES.BLOG}/${slug}/opengraph-image` as Route
  if (!locale) {
    return path
  }
  return buildLocalizedRoutePath(path, locale)
}

export function buildProjectHref(
  slug: string,
  locale?: SupportedLocale,
): Route {
  const path = `${ROUTES.PROJECTS}/${slug}` as Route
  if (!locale) {
    return path
  }
  return buildLocalizedRoutePath(path, locale)
}

export function buildProjectOgImagePath(
  slug: string,
  locale?: SupportedLocale,
): Route {
  const path = `${ROUTES.PROJECTS}/${slug}/opengraph-image` as Route
  if (!locale) {
    return path
  }
  return buildLocalizedRoutePath(path, locale)
}

export function buildBlogTagHref(tag: string, locale?: SupportedLocale): Route {
  const searchParams = new URLSearchParams([[DEFAULT_TAG_QUERY_KEY, tag]])
  const path = `${ROUTES.BLOG}?${searchParams.toString()}` as Route
  if (!locale) {
    return path
  }

  const [pathname, queryString = ''] = path.split('?')
  const localizedPathname = buildLocalizedRoutePath(pathname, locale)
  return `${localizedPathname}${queryString ? `?${queryString}` : ''}` as Route
}

export const SITE = {
  NAME: 'leey00nsu 블로그',
  DEFAULT_DESCRIPTION: 'leey00nsu 블로그',
  GOOGLE_SITE_VERIFICATION: '3Y8976WxiphMh7V_jkcVQyibJ3qFuF3fDQ6GAj9iF-Q',
} as const

// 푸터 관련 상수
export const FOOTER = {
  DEFAULT_DESCRIPTION: '2025. leey00nsu All Rights Reserved.',
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
  // 렌더링 시 이미지 최대 높이(px)
  MAX_RENDER_HEIGHT: 600,
  // 렌더링 시 이미지 최대 너비(px)
  MAX_RENDER_WIDTH: 720,
} as const

// MDX / Frontmatter 관련 정규식
// 문서 선두의 frontmatter 블록을 제거하기 위한 패턴
export const FRONTMATTER_BLOCK_REGEX = /^---[\s\S]*?---\n?/
