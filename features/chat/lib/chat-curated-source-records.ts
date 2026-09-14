import GithubSlugger from 'github-slugger'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import type { SupportedLocale } from '@/shared/config/constants'
import { collectSearchTerms } from '@/shared/lib/search-terms'
import { splitBoundedMarkdownContent } from '@/shared/lib/split-bounded-markdown-content'

interface HeadingSection {
  title: string
  anchor: string
  lines: string[]
  parentTitles: string[]
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
  evidenceTime?: ChatEvidenceRecord['evidenceTime']
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
    MARKERS: /(?<![\p{L}\p{N}])[*_]+|[*_]+(?![\p{L}\p{N}])/gu,
    WHITESPACE: /[^\S\n]+/g,
  },
} as const

function isCodeFenceLine(line: string): boolean {
  const trimmedLine = line.trim()

  return (
    trimmedLine.startsWith(
      CURATED_SOURCE_RECORDS.CODE_FENCE_PATTERNS.BACKTICK,
    ) ||
    trimmedLine.startsWith(CURATED_SOURCE_RECORDS.CODE_FENCE_PATTERNS.TILDE)
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
        .replaceAll(CURATED_SOURCE_RECORDS.MARKDOWN_PATTERNS.IMAGE, '$1')
        .replaceAll(CURATED_SOURCE_RECORDS.MARKDOWN_PATTERNS.LINK, '$1')
        .replaceAll(CURATED_SOURCE_RECORDS.MARKDOWN_PATTERNS.INLINE_CODE, '$1')
        .replaceAll(CURATED_SOURCE_RECORDS.MARKDOWN_PATTERNS.HTML_TAG, ' ')
        .replaceAll(CURATED_SOURCE_RECORDS.MARKDOWN_PATTERNS.MARKERS, ' ')
        .replaceAll(CURATED_SOURCE_RECORDS.MARKDOWN_PATTERNS.WHITESPACE, ' ')
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
  const headingHierarchy: Array<{ level: number; title: string }> = []

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

    const headingMatch = line.match(CURATED_SOURCE_RECORDS.HEADING_PATTERN)

    if (headingMatch) {
      const title = headingMatch[2].trim()
      const headingLevel = headingMatch[1].length

      while (
        headingHierarchy.length > 0 &&
        (headingHierarchy.at(-1)?.level ?? 0) >= headingLevel
      ) {
        headingHierarchy.pop()
      }

      currentSection = {
        title,
        anchor: slugger.slug(title),
        lines: [],
        parentTitles: headingHierarchy.map((heading) => heading.title),
      }
      headingSections.push(currentSection)
      headingHierarchy.push({ level: headingLevel, title })
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

function buildIntroRecord(
  params: BuildCuratedChatSourceRecordsParams & {
    introLines: string[]
  },
): ChatEvidenceRecord | null {
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
    excerpt: trimText(introText, CURATED_SOURCE_RECORDS.MAXIMUM_EXCERPT_LENGTH),
    content: introText,
    sectionTitle: null,
    tags: params.tags,
    searchTerms: buildRecordSearchTerms({
      title: params.title,
      sectionTitle: null,
      text: introText,
      tags: params.tags,
      baseSearchPhrases: params.baseSearchPhrases,
    }),
    evidenceTime: params.evidenceTime,
    sourceCategory: params.sourceCategory,
  }
}

function buildSectionRecord(
  params: BuildCuratedChatSourceRecordsParams & {
    section: HeadingSection
  },
): ChatEvidenceRecord | null {
  const sanitizedSectionText = sanitizeMarkdownToSearchText(
    params.section.lines.join('\n'),
  )

  if (!sanitizedSectionText) {
    return null
  }

  const content = `${[...params.section.parentTitles, params.section.title].join(' > ')}\n${sanitizedSectionText}`

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
      text: [
        ...params.section.parentTitles,
        params.section.title,
        sanitizedSectionText,
      ].join(' '),
      tags: params.tags,
      baseSearchPhrases: [
        ...params.section.parentTitles,
        params.section.title,
        ...params.baseSearchPhrases,
      ],
    }),
    evidenceTime: params.evidenceTime,
    sourceCategory: params.sourceCategory,
  }
}

export function buildCuratedChatSourceRecords(
  params: BuildCuratedChatSourceRecordsParams,
): ChatEvidenceRecord[] {
  const { introLines, headingSections } = buildHeadingSections(
    params.markdownContent,
  )
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

  return records.flatMap((record) => {
    return splitBoundedMarkdownContent(
      record.content,
      CURATED_SOURCE_RECORDS.MAXIMUM_CONTENT_LENGTH,
    ).map((content, index) => ({
      ...record,
      id: index === 0 ? record.id : `${record.id}/chunk/${index + 1}`,
      content,
      excerpt: trimText(content, CURATED_SOURCE_RECORDS.MAXIMUM_EXCERPT_LENGTH),
    }))
  })
}
