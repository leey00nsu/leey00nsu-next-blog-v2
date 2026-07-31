import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'

interface BuildChatEvidenceContextParams {
  matches: ChatEvidenceRecord[]
  maximumRecordCount: number
  maximumCharacters: number
}

const CHAT_EVIDENCE_CONTEXT = {
  INTRO_SECTION_LABEL: 'intro',
  ENTRY_SEPARATOR: '\n',
  TRUNCATION_MARKER: '…',
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

function buildEvidenceEntry(match: ChatEvidenceRecord): string {
  const sectionLabel =
    match.sectionTitle ?? CHAT_EVIDENCE_CONTEXT.INTRO_SECTION_LABEL

  return [
    `- source=${match.sourceCategory}`,
    `- title=${match.title}`,
    `  section=${sectionLabel}`,
    `  url=${match.url}`,
    `  excerpt=${match.excerpt}`,
    `  content=${match.content}`,
  ].join('\n')
}

export function buildChatEvidenceContext({
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
        buildEvidenceEntry(match),
        maximumEntryCharacters,
      )
    })
    .join(CHAT_EVIDENCE_CONTEXT.ENTRY_SEPARATOR)
    .slice(0, maximumCharacters)
}
