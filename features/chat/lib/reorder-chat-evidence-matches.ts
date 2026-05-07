import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'

interface ReorderChatEvidenceMatchesParams {
  matches: ChatEvidenceRecord[]
  rankedEvidenceIds: string[]
}

export function reorderChatEvidenceMatches({
  matches,
  rankedEvidenceIds,
}: ReorderChatEvidenceMatchesParams): ChatEvidenceRecord[] {
  if (rankedEvidenceIds.length === 0) {
    return matches
  }

  const matchLookup = new Map(
    matches.map((match) => {
      return [match.id, match] as const
    }),
  )
  const reorderedMatches = rankedEvidenceIds
    .map((rankedEvidenceId) => {
      return matchLookup.get(rankedEvidenceId)
    })
    .filter((match): match is ChatEvidenceRecord => {
      return match !== undefined
    })
  const rankedEvidenceIdSet = new Set(rankedEvidenceIds)
  const remainingMatches = matches.filter((match) => {
    return !rankedEvidenceIdSet.has(match.id)
  })

  return [...reorderedMatches, ...remainingMatches]
}
