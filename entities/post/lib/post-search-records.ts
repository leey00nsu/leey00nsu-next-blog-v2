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
import { splitMarkdownBlocks } from '@/shared/lib/split-markdown-blocks'

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
  MARKERS: /(?<![\p{L}\p{N}])[*_]+|[*_]+(?![\p{L}\p{N}])/gu,
  WHITESPACE: /[^\S\n]+/g,
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
  let isInsideCodeFence = false

  return markdown
    .split('\n')
    .map((line) => {
      if (isCodeFenceLine(line)) {
        isInsideCodeFence = !isInsideCodeFence
        return line
      }
      if (isInsideCodeFence) return line
      return line
        .replaceAll(MARKDOWN_PATTERNS.IMAGE, '$1')
        .replaceAll(MARKDOWN_PATTERNS.LINK, '$1')
        .replaceAll(MARKDOWN_PATTERNS.INLINE_CODE, '$1')
        .replaceAll(MARKDOWN_PATTERNS.HTML_TAG, ' ')
        .replaceAll(MARKDOWN_PATTERNS.MARKERS, ' ')
        .replaceAll(MARKDOWN_PATTERNS.WHITESPACE, ' ')
        .trim()
    })
    .join('\n')
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

function splitOversizedContent(text: string, maximumLength: number): string[] {
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

function splitSearchContent(text: string, maximumLength: number): string[] {
  const chunks: string[] = []
  let currentChunk = ''

  for (const block of splitMarkdownBlocks(text)) {
    const combinedChunk = currentChunk ? `${currentChunk}\n\n${block}` : block
    if (combinedChunk.length <= maximumLength) {
      currentChunk = combinedChunk
      continue
    }
    if (currentChunk) chunks.push(currentChunk)
    currentChunk = ''
    if (block.length > maximumLength) {
      chunks.push(...splitOversizedContent(block, maximumLength))
    } else {
      currentChunk = block
    }
  }
  if (currentChunk) chunks.push(currentChunk)
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
  // CRLF로 저장된 글도 제목을 제목으로 인식해야 한다. 줄 끝 \r이 남으면 제목 정규식이 빗나가
  // 글 전체가 하나의 서론 덩어리로 잘린다.
  const lines = content.replaceAll(POST_SEARCH.LINE_ENDING_PATTERN, '\n').split('\n')
  const headingSections: HeadingSection[] = []
  const introLines: string[] = []
  const slugger = new GithubSlugger()

  let currentSection: HeadingSection | null = null
  let isInsideCodeFence = false

  for (const line of lines) {
    if (isCodeFenceLine(line)) {
      isInsideCodeFence = !isInsideCodeFence
      ;(currentSection ? currentSection.lines : introLines).push(line)
      continue
    }

    if (isInsideCodeFence) {
      ;(currentSection ? currentSection.lines : introLines).push(line)
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
