import GithubSlugger from 'github-slugger'
import { POST_SEARCH } from '@/entities/post/config/constants'
import type { BlogSearchRecord } from '@/entities/post/model/search-types'
import type { Post } from '@/entities/post/model/types'
import { buildBlogPostHref, type SupportedLocale } from '@/shared/config/constants'
import { getSemanticSearchTerms } from '@/shared/lib/chat-semantic-map'
import { collectSearchTerms } from '@/shared/lib/search-terms'

interface BuildPostSearchRecordsParams {
  post: Post
  locale: SupportedLocale
}

interface HeadingSection {
  depth: number
  title: string
  anchor: string
  lines: string[]
}

const CODE_FENCE_PATTERNS = {
  BACKTICK: '```',
  TILDE: '~~~',
} as const

const MARKDOWN_PATTERNS = {
  HEADING: /^(#{2,3})\s+(.*)$/,
  IMAGE: /!\[([^\]]*)\]\([^)]+\)/g,
  LINK: /\[([^\]]+)\]\([^)]+\)/g,
  INLINE_CODE: /`([^`]+)`/g,
  HTML_TAG: /<[^>]+>/g,
  MARKERS: /[*_>#~-]/g,
  WHITESPACE: /\s+/g,
} as const

const SCRIPT_BOUNDARY_PATTERNS = {
  LATIN_TO_HANGUL: /([A-Za-z])([가-힣])/g,
  HANGUL_TO_LATIN: /([가-힣])([A-Za-z])/g,
} as const

function isCodeFenceLine(line: string): boolean {
  const trimmedLine = line.trim()

  return (
    trimmedLine.startsWith(CODE_FENCE_PATTERNS.BACKTICK) ||
    trimmedLine.startsWith(CODE_FENCE_PATTERNS.TILDE)
  )
}

function sanitizeMarkdownToSearchText(markdown: string): string {
  return markdown
    .replaceAll(MARKDOWN_PATTERNS.IMAGE, '$1')
    .replaceAll(MARKDOWN_PATTERNS.LINK, '$1')
    .replaceAll(MARKDOWN_PATTERNS.INLINE_CODE, '$1')
    .replaceAll(MARKDOWN_PATTERNS.HTML_TAG, ' ')
    .replaceAll(MARKDOWN_PATTERNS.MARKERS, ' ')
    .replaceAll(MARKDOWN_PATTERNS.WHITESPACE, ' ')
    .trim()
}

function trimText(text: string, maximumLength: number): string {
  if (text.length <= maximumLength) {
    return text
  }

  return `${text.slice(0, maximumLength - 1).trimEnd()}…`
}

function createRecordId(locale: SupportedLocale, slug: string, anchor: string): string {
  return `${locale}/${slug}/${anchor}`
}

function createRecordUrl(
  slug: string,
  locale: SupportedLocale,
  anchor?: string,
): string {
  const postUrl = buildBlogPostHref(slug, locale)

  if (!anchor) {
    return postUrl
  }

  return `${postUrl}#${anchor}`
}

function buildHeadingSections(content: string): {
  introLines: string[]
  headingSections: HeadingSection[]
} {
  const lines = content.split('\n')
  const headingSections: HeadingSection[] = []
  const introLines: string[] = []
  const slugger = new GithubSlugger()

  let currentSection: HeadingSection | null = null
  let isInsideCodeFence = false

  for (const line of lines) {
    if (isCodeFenceLine(line)) {
      isInsideCodeFence = !isInsideCodeFence
      continue
    }

    if (isInsideCodeFence) {
      continue
    }

    const headingMatch = line.match(MARKDOWN_PATTERNS.HEADING)

    if (headingMatch) {
      const depth = headingMatch[1].length
      const title = headingMatch[2].trim()
      const anchor = slugger.slug(title)

      currentSection = {
        depth,
        title,
        anchor,
        lines: [],
      }
      headingSections.push(currentSection)
      continue
    }

    if (currentSection) {
      currentSection.lines.push(line)
      continue
    }

    introLines.push(line)
  }

  return {
    introLines,
    headingSections,
  }
}

function createSearchRecord(params: {
  anchor: string
  title: string
  sectionTitle: string | null
  body: string
  post: Post
  locale: SupportedLocale
}): BlogSearchRecord | null {
  const sanitizedBody = sanitizeMarkdownToSearchText(params.body)
  const semanticSearchTerms = getSemanticSearchTerms({
    locale: params.locale,
    slug: params.post.slug,
    sourceCategory: 'blog',
  })

  if (!sanitizedBody) {
    return null
  }

  return {
    id: createRecordId(params.locale, params.post.slug, params.anchor),
    locale: params.locale,
    slug: params.post.slug,
    title: params.post.title,
    url: createRecordUrl(
      params.post.slug,
      params.locale,
      params.sectionTitle ? params.anchor : undefined,
    ),
    excerpt: trimText(sanitizedBody, POST_SEARCH.EXCERPT_MAX_LENGTH),
    content: trimText(
      params.sectionTitle
        ? `${params.sectionTitle}\n${sanitizedBody}`
        : sanitizedBody,
      POST_SEARCH.CONTENT_MAX_LENGTH,
    ),
    sectionTitle: params.sectionTitle,
    tags: params.post.tags,
    publishedAt: params.post.date.toISOString(),
    searchTerms: collectSearchTerms({
      texts: [params.post.title, params.sectionTitle ?? '', sanitizedBody],
      phrases: [
        ...semanticSearchTerms,
        params.post.title,
        params.sectionTitle ?? '',
        ...params.post.tags,
      ],
    }),
  }
}

export function buildPostSearchRecords({
  post,
  locale,
}: BuildPostSearchRecordsParams): BlogSearchRecord[] {
  const { introLines, headingSections } = buildHeadingSections(post.content)
  const records: BlogSearchRecord[] = []

  const introRecord = createSearchRecord({
    anchor: POST_SEARCH.INTRO_SECTION_SLUG,
    title: post.title,
    sectionTitle: null,
    body: introLines.join('\n'),
    post,
    locale,
  })

  if (introRecord) {
    records.push(introRecord)
  }

  for (const headingSection of headingSections) {
    const sectionRecord = createSearchRecord({
      anchor: headingSection.anchor,
      title: post.title,
      sectionTitle: headingSection.title,
      body: headingSection.lines.join('\n'),
      post,
      locale,
    })

    if (!sectionRecord) {
      continue
    }

    records.push(sectionRecord)
  }

  return records
}
