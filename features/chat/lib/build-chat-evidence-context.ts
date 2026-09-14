import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import { normalizeChatQuery } from '@/features/chat/lib/chat-query-normalization'
import { splitMarkdownBlocks } from '@/shared/lib/split-markdown-blocks'

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
  CONTENT_SEGMENT_PATTERN: /(?<=[.!?。！？])\s+/gu,
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
  if (params.match.content.length <= params.maximumCharacters) {
    return params.match.content
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
  const contentSegments = splitMarkdownBlocks(params.match.content)
    .flatMap((block) => {
      // Only oversized prose is split; structured blocks retain their boundaries.
      return block.length > params.maximumCharacters &&
        !/^(?:```|~~~|\||[-*+]\s|\d+\.\s)/u.test(block)
        ? block.split(CHAT_EVIDENCE_CONTEXT.CONTENT_SEGMENT_PATTERN)
        : [block]
    })
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

  const bestSegment = contentSegments.reduce((best, segment) => {
    return segment.relevanceScore > best.relevanceScore ? segment : best
  }, contentSegments[0])
  let startIndex = contentSegments.indexOf(bestSegment)
  let endIndex = startIndex + 1
  let relevantSegments = bestSegment.content
  // Expand contiguously: never splice unrelated sentences into a new causal claim.
  while (startIndex > 0 || endIndex < contentSegments.length) {
    const preceding =
      startIndex > 0 ? contentSegments[startIndex - 1].content : null
    const following =
      endIndex < contentSegments.length
        ? contentSegments[endIndex].content
        : null
    if (
      preceding &&
      preceding.length + relevantSegments.length + 2 <= params.maximumCharacters
    ) {
      relevantSegments = `${preceding}\n\n${relevantSegments}`
      startIndex -= 1
    } else if (
      following &&
      following.length + relevantSegments.length + 2 <= params.maximumCharacters
    ) {
      relevantSegments = `${relevantSegments}\n\n${following}`
      endIndex += 1
    } else {
      break
    }
  }
  if (startIndex > 0) relevantSegments = `…\n${relevantSegments}`

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
