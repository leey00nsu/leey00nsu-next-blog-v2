import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import type { BlogChatCitation } from '@/features/chat/model/chat-schema'

interface ValidateChatCitationsParams {
  usedCitationUrls: string[]
  matches: ChatEvidenceRecord[]
}

function buildCitationLookup(
  matches: ChatEvidenceRecord[],
): Map<string, ChatEvidenceRecord> {
  return new Map(matches.map((match) => [match.url, match]))
}

export function validateChatCitations({
  usedCitationUrls,
  matches,
}: ValidateChatCitationsParams): BlogChatCitation[] {
  const citationLookup = buildCitationLookup(matches)
  const uniqueCitationUrls = [...new Set(usedCitationUrls)]

  return uniqueCitationUrls.flatMap((citationUrl) => {
    const matchedRecord = citationLookup.get(citationUrl)

    if (!matchedRecord) {
      return []
    }

    return [
      {
        title: matchedRecord.title,
        url: matchedRecord.url,
        sectionTitle: matchedRecord.sectionTitle,
        sourceCategory: matchedRecord.sourceCategory,
      },
    ]
  })
}
