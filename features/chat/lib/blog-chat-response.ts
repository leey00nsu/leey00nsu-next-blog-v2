import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import type {
  BlogChatCitation,
  BlogChatModelDraft,
  BlogChatResponse,
} from '@/features/chat/model/chat-schema'

interface FinalizeBlogChatResponseParams {
  draftAnswer: BlogChatModelDraft
  matches: ChatEvidenceRecord[]
}

function buildCitationLookup(
  matches: ChatEvidenceRecord[],
): Map<string, ChatEvidenceRecord> {
  return new Map(matches.map((match) => [match.url, match]))
}

function buildCitations(
  citationUrls: string[],
  citationLookup: Map<string, ChatEvidenceRecord>,
): BlogChatCitation[] {
  const uniqueCitationUrls = [...new Set(citationUrls)]

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

function buildRefusalResponse(
  refusalReason: BlogChatResponse['refusalReason'],
): BlogChatResponse {
  return {
    answer: '',
    citations: [],
    grounded: false,
    refusalReason,
  }
}

export function finalizeBlogChatResponse({
  draftAnswer,
  matches,
}: FinalizeBlogChatResponseParams): BlogChatResponse {
  if (draftAnswer.refusalReason === 'insufficient_evidence') {
    return buildRefusalResponse('insufficient_evidence')
  }

  const citationLookup = buildCitationLookup(matches)
  const citations = buildCitations(draftAnswer.usedCitationUrls, citationLookup)

  if (citations.length === 0) {
    return buildRefusalResponse('invalid_citations')
  }

  return {
    answer: draftAnswer.answer.trim(),
    citations,
    grounded: true,
  }
}
