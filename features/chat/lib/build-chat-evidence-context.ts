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
  CONTENT_SEPARATOR: '\n\n',
  OMITTED_CONTENT_SEPARATOR: '\n\n…\n\n',
  TRUNCATION_MARKER: '…',
  OMITTED_TABLE_ROW_MARKER: '| … |',
  CONTENT_SEGMENT_PATTERN: /(?<=[.!?。！？])\s+/gu,
  TABLE_ROW_START_PATTERN: /^\s*\|/u,
  TABLE_SEPARATOR_PATTERN: /^\s*\|[\s:|-]+\|\s*$/u,
  KOREAN_PARTICLE_PATTERN:
    /(?:에서|으로|에게|한테|처럼|부터|까지|은|는|이|가|을|를|와|과|로|의)$/u,
} as const

/** 표는 행이 곧 하나의 사실이므로, 잘라 버리는 대신 질문과 가까운 행을 남긴다. */
function isMarkdownTableBlock(block: string): boolean {
  const lines = block.split('\n')

  return (
    lines.length > 2 &&
    CHAT_EVIDENCE_CONTEXT.TABLE_ROW_START_PATTERN.test(lines[0]) &&
    CHAT_EVIDENCE_CONTEXT.TABLE_SEPARATOR_PATTERN.test(lines[1])
  )
}

function selectMarkdownTableRows(params: {
  block: string
  queryTokens: string[]
  maximumCharacters: number
}): string {
  const lines = params.block.split('\n')
  const headerLines = lines.slice(0, 2)
  const scoredRows = lines.slice(2).map((row, originalIndex) => {
    return {
      row,
      originalIndex,
      relevanceScore: params.queryTokens.reduce((score, queryToken) => {
        return score + countTokenOccurrences(row.toLowerCase(), queryToken)
      }, 0),
    }
  })
  const selectedRowIndexes = new Set<number>()
  // 행을 덜어낼 때 붙일 생략 표시 자리까지 미리 남겨 둔다.
  let selectedCharacters =
    headerLines.join('\n').length +
    CHAT_EVIDENCE_CONTEXT.OMITTED_TABLE_ROW_MARKER.length +
    1

  for (const scoredRow of scoredRows.toSorted((leftRow, rightRow) => {
    return (
      rightRow.relevanceScore - leftRow.relevanceScore ||
      leftRow.originalIndex - rightRow.originalIndex
    )
  })) {
    if (
      selectedCharacters + scoredRow.row.length + 1 >
      params.maximumCharacters
    ) {
      continue
    }

    selectedRowIndexes.add(scoredRow.originalIndex)
    selectedCharacters += scoredRow.row.length + 1
  }

  const omittedRowMarker =
    selectedRowIndexes.size < scoredRows.length
      ? [CHAT_EVIDENCE_CONTEXT.OMITTED_TABLE_ROW_MARKER]
      : []

  return [
    ...headerLines,
    ...scoredRows
      .filter((scoredRow) => selectedRowIndexes.has(scoredRow.originalIndex))
      .map((scoredRow) => scoredRow.row),
    ...omittedRowMarker,
  ].join('\n')
}

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

  const markerCharacterCount = CHAT_EVIDENCE_CONTEXT.TRUNCATION_MARKER.length
  const candidateLength = maximumCharacters - markerCharacterCount
  const truncatedText = entry.slice(0, candidateLength)
  const lineStartIndex = truncatedText.lastIndexOf('\n') + 1

  // 표 행이 중간에서 끊기면 남은 조각이 다른 값처럼 읽힌다. 그 행은 통째로 버린다.
  if (
    lineStartIndex > 0 &&
    CHAT_EVIDENCE_CONTEXT.TABLE_ROW_START_PATTERN.test(
      truncatedText.slice(lineStartIndex),
    )
  ) {
    return `${entry.slice(0, lineStartIndex - 1)}${CHAT_EVIDENCE_CONTEXT.TRUNCATION_MARKER}`
  }

  return `${truncatedText}${CHAT_EVIDENCE_CONTEXT.TRUNCATION_MARKER}`
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
      if (
        isMarkdownTableBlock(block) &&
        block.length > params.maximumCharacters
      ) {
        return [
          selectMarkdownTableRows({
            block,
            queryTokens,
            maximumCharacters:
              params.maximumCharacters -
              CHAT_EVIDENCE_CONTEXT.OMITTED_CONTENT_SEPARATOR.length * 2,
          }),
        ]
      }

      // Only oversized prose is split; structured blocks retain their boundaries.
      return block.length > params.maximumCharacters &&
        !/^(?:```|~~~|\||[-*+]\s|\d+\.\s)/u.test(block)
        ? block.split(CHAT_EVIDENCE_CONTEXT.CONTENT_SEGMENT_PATTERN)
        : [block]
    })
    .map((contentSegment, originalIndex) => {
      const normalizedSegment = contentSegment.toLowerCase().trim()
      return {
        content: contentSegment.trim(),
        originalIndex,
        matchedTokens: new Set(
          queryTokens.filter((queryToken) =>
            normalizedSegment.includes(queryToken),
          ),
        ),
      }
    })
    .filter((contentSegment) => {
      return Boolean(contentSegment.content)
    })

  if (
    queryTokens.length === 0 ||
    !contentSegments.some((segment) => segment.matchedTokens.size > 0)
  ) {
    return truncateEvidenceEntry(params.match.content, params.maximumCharacters)
  }

  const selectedIndexes = new Set<number>()
  const coveredTokens = new Set<string>()
  const tokenFrequencies = new Map(
    queryTokens.map((token) => [
      token,
      contentSegments.filter((segment) => segment.matchedTokens.has(token))
        .length,
    ]),
  )
  function formatSelectedContent(indexes: Set<number>): string {
    let previousIndex = -1
    const parts: string[] = []
    for (const segment of contentSegments) {
      if (!indexes.has(segment.originalIndex)) continue
      if (segment.originalIndex > previousIndex + 1) {
        parts.push(CHAT_EVIDENCE_CONTEXT.OMITTED_CONTENT_SEPARATOR)
      } else if (parts.length > 0) {
        parts.push(CHAT_EVIDENCE_CONTEXT.CONTENT_SEPARATOR)
      }
      parts.push(segment.content)
      previousIndex = segment.originalIndex
    }
    if (previousIndex < contentSegments.length - 1) {
      parts.push(CHAT_EVIDENCE_CONTEXT.OMITTED_CONTENT_SEPARATOR)
    }
    return parts.join('').trim()
  }

  // 반복되는 이름보다 아직 담지 못한 질문 근거를 우선한다.
  // 떨어진 블록은 원문 순서와 생략 표시를 유지해 인과관계로 이어 붙이지 않는다.
  while (selectedIndexes.size < contentSegments.length) {
    const candidates = contentSegments
      .filter((segment) => !selectedIndexes.has(segment.originalIndex))
      .map((segment) => ({
        ...segment,
        relevanceScore:
          [...segment.matchedTokens].reduce((score, token) => {
            return coveredTokens.has(token)
              ? score
              : score + 1 / (tokenFrequencies.get(token) ?? 1)
          }, 0) / segment.content.length,
      }))
      .toSorted((left, right) => {
        return (
          right.relevanceScore - left.relevanceScore ||
          left.originalIndex - right.originalIndex
        )
      })
    const selected = candidates.find((segment) => {
      return (
        formatSelectedContent(
          new Set([...selectedIndexes, segment.originalIndex]),
        ).length <= params.maximumCharacters
      )
    })
    if (!selected) break
    selectedIndexes.add(selected.originalIndex)
    for (const token of selected.matchedTokens) coveredTokens.add(token)
  }

  return selectedIndexes.size > 0
    ? formatSelectedContent(selectedIndexes)
    : truncateEvidenceEntry(params.match.content, params.maximumCharacters)
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
    `- evidence_id=${match.id}`,
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
  let usedEntryCharacters = 0
  const entries = selectedMatches.map((match, index) => {
    // 남은 항목의 몫을 보장한 뒤, 앞 항목이 쓰지 않은 예산은 뒤 항목이 이어받는다.
    const remainingMatchCount = selectedMatches.length - index - 1
    const availableCharacters = Math.max(
      maximumEntryCharacters,
      availableEntryCharacters -
        usedEntryCharacters -
        maximumEntryCharacters * remainingMatchCount,
    )
    const entry = truncateEvidenceEntry(
      buildEvidenceEntry({
        match,
        question,
        maximumCharacters: availableCharacters,
      }),
      availableCharacters,
    )

    usedEntryCharacters += entry.length

    return entry
  })

  return entries
    .join(CHAT_EVIDENCE_CONTEXT.ENTRY_SEPARATOR)
    .slice(0, maximumCharacters)
}
