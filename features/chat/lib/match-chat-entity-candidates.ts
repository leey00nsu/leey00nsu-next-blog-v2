import type { ChatEntityCandidate } from '@/features/chat/model/chat-entity-candidate'

function normalizeMatchingText(value: string): string {
  return value.toLocaleLowerCase().replaceAll(/[^\p{L}\p{N}]/gu, '')
}

export function matchChatEntityCandidates(params: {
  question: string
  candidates: ChatEntityCandidate[]
}): ChatEntityCandidate[] {
  const normalizedQuestion = normalizeMatchingText(params.question)

  return params.candidates.filter((candidate) => {
    return candidate.aliases.some((alias) => {
      const normalizedAlias = normalizeMatchingText(alias)

      return Boolean(normalizedAlias) && normalizedQuestion.includes(normalizedAlias)
    })
  })
}
