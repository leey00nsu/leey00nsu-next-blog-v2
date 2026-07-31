import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import { normalizeChatQuery } from '@/features/chat/lib/chat-query-normalization'

interface BuildChatEvidenceContextParams {
  question?: string
  matches: ChatEvidenceRecord[]
  maximumRecordCount: number
  maximumCharacters: number
}

const CHAT_EVIDENCE_CONTEXT = {
  INTRO_SECTION_LABEL: 'intro',
  ENTRY_SEPARATOR: '\n',
  TRUNCATION_MARKER: '…',
  CONTENT_SEGMENT_PATTERN: /(?<=[.!?。！？])\s*|\n+/gu,
  MAXIMUM_RELEVANT_SEGMENT_COUNT: 6,
  KOREAN_PARTICLE_PATTERN:
    /(?:에서|으로|에게|한테|처럼|부터|까지|은|는|이|가|을|를|와|과|로|의)$/u,
} as const

function truncateEvidenceEntry(
  entry: string,
  maximumCharacters: number,
): string {
  if (entry.length <= maximumCharacters) {
    return entry
  }

  if (maximumCharacters <= CHAT_EVIDENCE_CONTEXT.TRUNCATION_MARKER.length) {
    return CHAT_EVIDENCE_CONTEXT.TRUNCATION_MARKER.slice(0, maximumCharacters)
  }

  return `${entry.slice(
    0,
    maximumCharacters - CHAT_EVIDENCE_CONTEXT.TRUNCATION_MARKER.length,
  )}${CHAT_EVIDENCE_CONTEXT.TRUNCATION_MARKER}`
}

function countTokenOccurrences(text: string, token: string): number {
  let occurrenceCount = 0
  let searchStartIndex = 0

  while (searchStartIndex < text.length) {
    const occurrenceIndex = text.indexOf(token, searchStartIndex)

    if (occurrenceIndex === -1) {
      break
    }

    occurrenceCount += 1
    searchStartIndex = occurrenceIndex + token.length
  }

  return occurrenceCount
}

function selectRelevantEvidenceContent(params: {
  match: ChatEvidenceRecord
  question: string
  maximumCharacters: number
}): string {
  if (params.maximumCharacters <= 0) {
    return ''
  }

  const queryTokens = normalizeChatQuery({
    question: params.question,
    locale: params.match.locale,
  }).queryTokens.flatMap((queryToken) => {
    const normalizedToken = queryToken
      .toLowerCase()
      .replace(CHAT_EVIDENCE_CONTEXT.KOREAN_PARTICLE_PATTERN, '')

    return normalizedToken && normalizedToken !== queryToken.toLowerCase()
      ? [queryToken.toLowerCase(), normalizedToken]
      : [queryToken.toLowerCase()]
  })
  const contentSegments = params.match.content
    .split(CHAT_EVIDENCE_CONTEXT.CONTENT_SEGMENT_PATTERN)
    .map((contentSegment, originalIndex) => {
      const normalizedSegment = contentSegment.toLowerCase().trim()
      const relevanceScore = queryTokens.reduce((score, queryToken) => {
        return score + countTokenOccurrences(normalizedSegment, queryToken)
      }, 0)

      return {
        content: contentSegment.trim(),
        originalIndex,
        relevanceScore,
      }
    })
    .filter((contentSegment) => {
      return Boolean(contentSegment.content)
    })

  if (queryTokens.length === 0 || contentSegments.length <= 1) {
    return truncateEvidenceEntry(params.match.content, params.maximumCharacters)
  }

  const relevantSegments = contentSegments
    .toSorted((leftSegment, rightSegment) => {
      return (
        rightSegment.relevanceScore - leftSegment.relevanceScore ||
        leftSegment.originalIndex - rightSegment.originalIndex
      )
    })
    .slice(0, CHAT_EVIDENCE_CONTEXT.MAXIMUM_RELEVANT_SEGMENT_COUNT)
    .toSorted((leftSegment, rightSegment) => {
      return leftSegment.originalIndex - rightSegment.originalIndex
    })
    .map((contentSegment) => contentSegment.content)
    .join(' ')

  return truncateEvidenceEntry(
    relevantSegments || params.match.content,
    params.maximumCharacters,
  )
}

function buildEvidenceEntry(params: {
  match: ChatEvidenceRecord
  question: string
  maximumCharacters: number
}): string {
  const match = params.match
  const sectionLabel =
    match.sectionTitle ?? CHAT_EVIDENCE_CONTEXT.INTRO_SECTION_LABEL
  const metadata = [
    `- source=${match.sourceCategory}`,
    `- title=${match.title}`,
    `  section=${sectionLabel}`,
    `  url=${match.url}`,
    `  excerpt=${match.excerpt}`,
    '  content=',
  ].join('\n')
  const maximumContentCharacters = Math.max(
    0,
    params.maximumCharacters - metadata.length,
  )
  const relevantContent = selectRelevantEvidenceContent({
    match,
    question: params.question,
    maximumCharacters: maximumContentCharacters,
  })

  return `${metadata}${relevantContent}`
}

export function buildChatEvidenceContext({
  question = '',
  matches,
  maximumRecordCount,
  maximumCharacters,
}: BuildChatEvidenceContextParams): string {
  const selectedMatches = matches.slice(0, maximumRecordCount)

  if (selectedMatches.length === 0 || maximumCharacters <= 0) {
    return ''
  }

  const separatorCharacterCount =
    CHAT_EVIDENCE_CONTEXT.ENTRY_SEPARATOR.length * (selectedMatches.length - 1)
  const availableEntryCharacters = Math.max(
    0,
    maximumCharacters - separatorCharacterCount,
  )
  const maximumEntryCharacters = Math.floor(
    availableEntryCharacters / selectedMatches.length,
  )

  return selectedMatches
    .map((match) => {
      return truncateEvidenceEntry(
        buildEvidenceEntry({
          match,
          question,
          maximumCharacters: maximumEntryCharacters,
        }),
        maximumEntryCharacters,
      )
    })
    .join(CHAT_EVIDENCE_CONTEXT.ENTRY_SEPARATOR)
    .slice(0, maximumCharacters)
}
