import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'

interface ReorderChatEvidenceMatchesParams {
  matches: ChatEvidenceRecord[]
  rankedUrls: string[]
}

export function reorderChatEvidenceMatches({
  matches,
  rankedUrls,
}: ReorderChatEvidenceMatchesParams): ChatEvidenceRecord[] {
  if (rankedUrls.length === 0) {
    return matches
  }

  const matchLookup = new Map(
    matches.map((match) => {
      return [match.url, match] as const
    }),
  )
  const reorderedMatches = rankedUrls
    .map((rankedUrl) => {
      return matchLookup.get(rankedUrl)
    })
    .filter((match): match is ChatEvidenceRecord => {
      return match !== undefined
    })
  const rankedUrlSet = new Set(rankedUrls)
  const remainingMatches = matches.filter((match) => {
    return !rankedUrlSet.has(match.url)
  })

  return [...reorderedMatches, ...remainingMatches]
}
