import GithubSlugger from 'github-slugger'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import type { SupportedLocale } from '@/shared/config/constants'
import { collectSearchTerms } from '@/shared/lib/search-terms'

interface HeadingSection {
  title: string
  anchor: string
  lines: string[]
}

interface BuildCuratedChatSourceRecordsParams {
  idPrefix: string
  locale: SupportedLocale
  slug: string
  title: string
  baseUrl: string
  introContent?: string
  markdownContent: string
  tags: string[]
  baseSearchPhrases: string[]
  sourceCategory: ChatEvidenceRecord['sourceCategory']
}

const CURATED_SOURCE_RECORDS = {
  MAXIMUM_EXCERPT_LENGTH: 180,
  MAXIMUM_CONTENT_LENGTH: 700,
  HEADING_PATTERN: /^(#{2,4})\s+(.*)$/,
  CODE_FENCE_PATTERNS: {
    BACKTICK: '```',
    TILDE: '~~~',
  },
  MARKDOWN_PATTERNS: {
    IMAGE: /!\[([^\]]*)\]\([^)]+\)/g,
    LINK: /\[([^\]]+)\]\([^)]+\)/g,
    INLINE_CODE: /`([^`]+)`/g,
    HTML_TAG: /<[^>]+>/g,
    MARKERS: /[*_>#~-]/g,
    WHITESPACE: /\s+/g,
  },
} as const

function isCodeFenceLine(line: string): boolean {
  const trimmedLine = line.trim()

  return (
    trimmedLine.startsWith(CURATED_SOURCE_RECORDS.CODE_FENCE_PATTERNS.BACKTICK) ||
    trimmedLine.startsWith(CURATED_SOURCE_RECORDS.CODE_FENCE_PATTERNS.TILDE)
  )
}

function sanitizeMarkdownToSearchText(markdown: string): string {
  return markdown
    .replaceAll(CURATED_SOURCE_RECORDS.MARKDOWN_PATTERNS.IMAGE, '$1')
    .replaceAll(CURATED_SOURCE_RECORDS.MARKDOWN_PATTERNS.LINK, '$1')
    .replaceAll(CURATED_SOURCE_RECORDS.MARKDOWN_PATTERNS.INLINE_CODE, '$1')
    .replaceAll(CURATED_SOURCE_RECORDS.MARKDOWN_PATTERNS.HTML_TAG, ' ')
    .replaceAll(CURATED_SOURCE_RECORDS.MARKDOWN_PATTERNS.MARKERS, ' ')
    .replaceAll(CURATED_SOURCE_RECORDS.MARKDOWN_PATTERNS.WHITESPACE, ' ')
    .trim()
}

function trimText(text: string, maximumLength: number): string {
  if (text.length <= maximumLength) {
    return text
  }

  return `${text.slice(0, maximumLength - 1).trimEnd()}…`
}

function buildHeadingSections(markdownContent: string): {
  introLines: string[]
  headingSections: HeadingSection[]
} {
  const lines = markdownContent.split('\n')
  const introLines: string[] = []
  const headingSections: HeadingSection[] = []
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

    const headingMatch = line.match(CURATED_SOURCE_RECORDS.HEADING_PATTERN)

    if (headingMatch) {
      const title = headingMatch[2].trim()
      currentSection = {
        title,
        anchor: slugger.slug(title),
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

function buildRecordSearchTerms(params: {
  title: string
  sectionTitle: string | null
  text: string
  tags: string[]
  baseSearchPhrases: string[]
}): string[] {
  return collectSearchTerms({
    texts: [params.title, params.sectionTitle ?? '', params.text],
    phrases: [
      ...params.baseSearchPhrases,
      params.title,
      params.sectionTitle ?? '',
      ...params.tags,
    ],
  })
}

function buildIntroRecord(params: BuildCuratedChatSourceRecordsParams & {
  introLines: string[]
}): ChatEvidenceRecord | null {
  const introText = [
    params.introContent ?? '',
    sanitizeMarkdownToSearchText(params.introLines.join('\n')),
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  if (!introText) {
    return null
  }

  return {
    id: params.idPrefix,
    locale: params.locale,
    slug: params.slug,
    title: params.title,
    url: params.baseUrl,
    excerpt: trimText(
      introText,
      CURATED_SOURCE_RECORDS.MAXIMUM_EXCERPT_LENGTH,
    ),
    content: trimText(
      introText,
      CURATED_SOURCE_RECORDS.MAXIMUM_CONTENT_LENGTH,
    ),
    sectionTitle: null,
    tags: params.tags,
    searchTerms: buildRecordSearchTerms({
      title: params.title,
      sectionTitle: null,
      text: introText,
      tags: params.tags,
      baseSearchPhrases: params.baseSearchPhrases,
    }),
    sourceCategory: params.sourceCategory,
  }
}

function buildSectionRecord(params: BuildCuratedChatSourceRecordsParams & {
  section: HeadingSection
}): ChatEvidenceRecord | null {
  const sanitizedSectionText = sanitizeMarkdownToSearchText(
    params.section.lines.join('\n'),
  )

  if (!sanitizedSectionText) {
    return null
  }

  const content = trimText(
    `${params.section.title}\n${sanitizedSectionText}`,
    CURATED_SOURCE_RECORDS.MAXIMUM_CONTENT_LENGTH,
  )

  return {
    id: `${params.idPrefix}/${params.section.anchor}`,
    locale: params.locale,
    slug: params.slug,
    title: params.title,
    url: `${params.baseUrl}#${params.section.anchor}`,
    excerpt: trimText(
      sanitizedSectionText,
      CURATED_SOURCE_RECORDS.MAXIMUM_EXCERPT_LENGTH,
    ),
    content,
    sectionTitle: params.section.title,
    tags: params.tags,
    searchTerms: buildRecordSearchTerms({
      title: params.title,
      sectionTitle: params.section.title,
      text: sanitizedSectionText,
      tags: params.tags,
      baseSearchPhrases: params.baseSearchPhrases,
    }),
    sourceCategory: params.sourceCategory,
  }
}

export function buildCuratedChatSourceRecords(
  params: BuildCuratedChatSourceRecordsParams,
): ChatEvidenceRecord[] {
  const { introLines, headingSections } = buildHeadingSections(params.markdownContent)
  const records: ChatEvidenceRecord[] = []
  const introRecord = buildIntroRecord({
    ...params,
    introLines,
  })

  if (introRecord) {
    records.push(introRecord)
  }

  for (const section of headingSections) {
    const sectionRecord = buildSectionRecord({
      ...params,
      section,
    })

    if (!sectionRecord) {
      continue
    }

    records.push(sectionRecord)
  }

  return records
}
