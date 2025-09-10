import { Route } from 'next'

// 파일시스템/URL 경로 상수
export const PATHS = {
  FS: {
    PUBLIC_DIR: 'public',
    PUBLIC_POSTS_DIR: 'public/posts',
    ABOUT_MDX_PATH: 'public/about/about.mdx',
  },
  URL: {
    // URL 기준(마크다운/이미지 경로에 쓰이는 접두사)
    PUBLIC_POSTS_BASE: '/public/posts',
  },
} as const

// 경로 빌더
export function buildPostMdxRelativePath(slug: string): string {
  return `${PATHS.FS.PUBLIC_POSTS_DIR}/${slug}/${slug}.mdx`
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

// MDX / Frontmatter 관련 정규식
// 문서 선두의 frontmatter 블록을 제거하기 위한 패턴
export const FRONTMATTER_BLOCK_REGEX = /^---[\s\S]*?---\n?/
