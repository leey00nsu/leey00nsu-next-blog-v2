import GithubSlugger from 'github-slugger'
import { POST_SEARCH } from '@/entities/post/config/constants'
import type { BlogSearchRecord } from '@/entities/post/model/search-types'
import type { Post } from '@/entities/post/model/types'
import {
  buildBlogPostHref,
  type SupportedLocale,
} from '@/shared/config/constants'
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

const CONTENT_CHUNK_PATTERNS = {
  SENTENCE_BOUNDARY: /[.!?。！？](?:\s+|$)/gu,
  WHITESPACE_BOUNDARY: /\s+/gu,
  WHITESPACE: /\s/u,
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

function resolveContentChunkEnd(params: {
  text: string
  startIndex: number
  maximumLength: number
}): number {
  const maximumEndIndex = Math.min(
    params.text.length,
    params.startIndex + params.maximumLength,
  )

  if (maximumEndIndex >= params.text.length) {
    return params.text.length
  }

  const boundarySearchStartIndex =
    params.startIndex +
    Math.floor(
      params.maximumLength * POST_SEARCH.CONTENT_CHUNK_BOUNDARY_SEARCH_RATIO,
    )
  const boundarySearchText = params.text.slice(
    boundarySearchStartIndex,
    maximumEndIndex,
  )
  const findBoundaryEndIndex = (boundaryPattern: RegExp): number => {
    let boundaryEndIndex = 0

    for (const boundaryMatch of boundarySearchText.matchAll(boundaryPattern)) {
      boundaryEndIndex =
        boundarySearchStartIndex +
        (boundaryMatch.index ?? 0) +
        boundaryMatch[0].length
    }

    return boundaryEndIndex
  }
  const sentenceEndIndex = findBoundaryEndIndex(
    CONTENT_CHUNK_PATTERNS.SENTENCE_BOUNDARY,
  )

  if (sentenceEndIndex) {
    return sentenceEndIndex
  }

  const whitespaceEndIndex = findBoundaryEndIndex(
    CONTENT_CHUNK_PATTERNS.WHITESPACE_BOUNDARY,
  )

  return whitespaceEndIndex || maximumEndIndex
}

function resolveNextContentChunkStart(params: {
  text: string
  currentStartIndex: number
  currentEndIndex: number
}): number {
  const overlapStartIndex = Math.max(
    params.currentStartIndex + 1,
    params.currentEndIndex - POST_SEARCH.CONTENT_CHUNK_OVERLAP_LENGTH,
  )
  const overlapText = params.text.slice(
    overlapStartIndex,
    params.currentEndIndex,
  )
  const nextBoundaryOffset = overlapText.search(
    CONTENT_CHUNK_PATTERNS.WHITESPACE,
  )

  return nextBoundaryOffset === -1
    ? overlapStartIndex
    : overlapStartIndex + nextBoundaryOffset + 1
}

function splitSearchContent(text: string, maximumLength: number): string[] {
  if (text.length <= maximumLength) {
    return [text]
  }

  const chunks: string[] = []
  let startIndex = 0

  while (startIndex < text.length) {
    const endIndex = resolveContentChunkEnd({
      text,
      startIndex,
      maximumLength,
    })
    const chunk = text.slice(startIndex, endIndex).trim()

    if (chunk) {
      chunks.push(chunk)
    }

    if (endIndex >= text.length) {
      break
    }

    startIndex = resolveNextContentChunkStart({
      text,
      currentStartIndex: startIndex,
      currentEndIndex: endIndex,
    })
  }

  return chunks
}

function createRecordId(
  locale: SupportedLocale,
  slug: string,
  anchor: string,
): string {
  return `${locale}/${slug}/${anchor}`
}

function allocateUniqueRecordAnchor(params: {
  preferredAnchor: string
  usedRecordAnchors: Set<string>
  reservedHeadingAnchors: Set<string>
  allowReservedHeadingAnchor: boolean
}): string {
  let recordAnchor = params.preferredAnchor
  let collisionIndex = 2

  while (
    params.usedRecordAnchors.has(recordAnchor) ||
    (params.reservedHeadingAnchors.has(recordAnchor) &&
      (!params.allowReservedHeadingAnchor ||
        recordAnchor !== params.preferredAnchor))
  ) {
    recordAnchor = `${params.preferredAnchor}${POST_SEARCH.CONTENT_CHUNK_IDENTIFIER_SUFFIX}${collisionIndex}`
    collisionIndex += 1
  }

  params.usedRecordAnchors.add(recordAnchor)

  return recordAnchor
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

function createSearchRecords(params: {
  anchor: string
  title: string
  sectionTitle: string | null
  body: string
  post: Post
  locale: SupportedLocale
  usedRecordAnchors: Set<string>
  reservedHeadingAnchors: Set<string>
}): BlogSearchRecord[] {
  const sanitizedBody = sanitizeMarkdownToSearchText(params.body)
  const semanticSearchTerms = getSemanticSearchTerms({
    locale: params.locale,
    slug: params.post.slug,
    sourceCategory: 'blog',
  })

  if (!sanitizedBody) {
    return []
  }

  const contentPrefix = params.sectionTitle ? `${params.sectionTitle}\n` : ''
  const maximumBodyLength = Math.max(
    1,
    POST_SEARCH.CONTENT_MAX_LENGTH - contentPrefix.length,
  )
  const contentChunks = splitSearchContent(sanitizedBody, maximumBodyLength)

  return contentChunks.map((contentChunk, chunkIndex) => {
    const preferredRecordAnchor =
      chunkIndex === 0
        ? params.anchor
        : `${params.anchor}${POST_SEARCH.CONTENT_CHUNK_IDENTIFIER_SUFFIX}${chunkIndex + 1}`
    const recordAnchor = allocateUniqueRecordAnchor({
      preferredAnchor: preferredRecordAnchor,
      usedRecordAnchors: params.usedRecordAnchors,
      reservedHeadingAnchors: params.reservedHeadingAnchors,
      allowReservedHeadingAnchor: chunkIndex === 0,
    })

    return {
      id: createRecordId(params.locale, params.post.slug, recordAnchor),
      locale: params.locale,
      slug: params.post.slug,
      title: params.post.title,
      url: createRecordUrl(
        params.post.slug,
        params.locale,
        params.sectionTitle ? params.anchor : undefined,
      ),
      excerpt: trimText(contentChunk, POST_SEARCH.EXCERPT_MAX_LENGTH),
      content: `${contentPrefix}${contentChunk}`,
      sectionTitle: params.sectionTitle,
      tags: params.post.tags,
      publishedAt: params.post.date.toISOString(),
      searchTerms: collectSearchTerms({
        texts: [params.post.title, params.sectionTitle ?? '', contentChunk],
        phrases: [
          ...semanticSearchTerms,
          params.post.title,
          params.sectionTitle ?? '',
          ...params.post.tags,
        ],
      }),
    }
  })
}

export function buildPostSearchRecords({
  post,
  locale,
}: BuildPostSearchRecordsParams): BlogSearchRecord[] {
  const { introLines, headingSections } = buildHeadingSections(post.content)
  const records: BlogSearchRecord[] = []
  const usedRecordAnchors = new Set<string>()
  const reservedHeadingAnchors = new Set([
    POST_SEARCH.INTRO_SECTION_SLUG,
    ...headingSections.map((headingSection) => headingSection.anchor),
  ])

  const introRecords = createSearchRecords({
    anchor: POST_SEARCH.INTRO_SECTION_SLUG,
    title: post.title,
    sectionTitle: null,
    body: introLines.join('\n'),
    post,
    locale,
    usedRecordAnchors,
    reservedHeadingAnchors,
  })

  records.push(...introRecords)

  for (const headingSection of headingSections) {
    const sectionRecords = createSearchRecords({
      anchor: headingSection.anchor,
      title: post.title,
      sectionTitle: headingSection.title,
      body: headingSection.lines.join('\n'),
      post,
      locale,
      usedRecordAnchors,
      reservedHeadingAnchors,
    })

    records.push(...sectionRecords)
  }

  return records
}
