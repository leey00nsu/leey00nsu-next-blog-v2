import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'

const EXACT_CHAT_QUOTE = {
  OCCURRENCE_INTENT: /들어간|포함|적힌|나오는|찾아|contains?|occurs?|appears?/iu,
  QUOTED_TEXT: /‘([^’]+)’|“([^”]+)”|"([^"]+)"|'([^']+)'/gu,
  WHITESPACE: /\s+/gu,
} as const

function normalizeExactChatQuote(value: string): string {
  return value.trim().replaceAll(EXACT_CHAT_QUOTE.WHITESPACE, ' ').toLowerCase()
}

export function areExactChatQuotesSupported(params: {
  question: string
  matches: ChatEvidenceRecord[]
}): boolean {
  if (!EXACT_CHAT_QUOTE.OCCURRENCE_INTENT.test(params.question)) {
    return true
  }

  const quotedPhrases = [...params.question.matchAll(EXACT_CHAT_QUOTE.QUOTED_TEXT)]
    .map((match) => normalizeExactChatQuote(
      match[1] ?? match[2] ?? match[3] ?? match[4] ?? '',
    ))
    .filter(Boolean)

  if (quotedPhrases.length === 0) {
    return true
  }

  return quotedPhrases.every((phrase) => {
    return params.matches.some((match) => {
      return [match.title, match.sectionTitle, match.content, match.excerpt]
        .some((value) => normalizeExactChatQuote(value ?? '').includes(phrase))
    })
  })
}
