import { BLOG_CHAT } from '@/features/chat/config/constants'
import type {
  ChatEvidenceRecord,
  ChatSourceCategory,
} from '@/features/chat/model/chat-evidence'

interface FuseChatRetrievalMatchesParams {
  lexicalMatches: ChatEvidenceRecord[]
  semanticMatches: ChatEvidenceRecord[]
  preferredSourceCategories?: ChatSourceCategory[]
  currentPostSlug?: string
}

interface RankedChatEvidenceRecord extends ChatEvidenceRecord {
  score: number
  lexicalRank: number | null
  semanticRank: number | null
}

const CHAT_RETRIEVAL_FUSION = {
  RECIPROCAL_RANK_BASE: 10,
  LEXICAL_WEIGHT: 1.15,
  SEMANTIC_WEIGHT: 1,
  OVERLAP_BOOST: 0.12,
  SOURCE_CATEGORY_BOOST: 0.08,
  CURRENT_POST_BOOST: 0.04,
} as const

function buildReciprocalRankScore(rank: number, weight: number): number {
  return weight / (CHAT_RETRIEVAL_FUSION.RECIPROCAL_RANK_BASE + rank + 1)
}

function buildPublishedAtTimestamp(record: ChatEvidenceRecord): number {
  if (!record.publishedAt) {
    return 0
  }

  const publishedAtTimestamp = new Date(record.publishedAt).getTime()

  return Number.isNaN(publishedAtTimestamp) ? 0 : publishedAtTimestamp
}

function upsertRankedRecord(params: {
  rankedRecordMap: Map<string, RankedChatEvidenceRecord>
  record: ChatEvidenceRecord
  scoreDelta: number
  source: 'lexical' | 'semantic'
  rank: number
}): void {
  const existingRankedRecord = params.rankedRecordMap.get(params.record.url)

  if (!existingRankedRecord) {
    params.rankedRecordMap.set(params.record.url, {
      ...params.record,
      score: params.scoreDelta,
      lexicalRank: params.source === 'lexical' ? params.rank : null,
      semanticRank: params.source === 'semantic' ? params.rank : null,
    })

    return
  }

  params.rankedRecordMap.set(params.record.url, {
    ...existingRankedRecord,
    score: existingRankedRecord.score + params.scoreDelta,
    lexicalRank:
      params.source === 'lexical'
        ? params.rank
        : existingRankedRecord.lexicalRank,
    semanticRank:
      params.source === 'semantic'
        ? params.rank
        : existingRankedRecord.semanticRank,
  })
}

export function fuseChatRetrievalMatches({
  lexicalMatches,
  semanticMatches,
  preferredSourceCategories = [],
  currentPostSlug,
}: FuseChatRetrievalMatchesParams): ChatEvidenceRecord[] {
  const rankedRecordMap = new Map<string, RankedChatEvidenceRecord>()
  const preferredSourceCategorySet = new Set(preferredSourceCategories)

  for (const [rank, match] of lexicalMatches.entries()) {
    upsertRankedRecord({
      rankedRecordMap,
      record: match,
      scoreDelta: buildReciprocalRankScore(
        rank,
        CHAT_RETRIEVAL_FUSION.LEXICAL_WEIGHT,
      ),
      source: 'lexical',
      rank,
    })
  }

  for (const [rank, match] of semanticMatches.entries()) {
    upsertRankedRecord({
      rankedRecordMap,
      record: match,
      scoreDelta: buildReciprocalRankScore(
        rank,
        CHAT_RETRIEVAL_FUSION.SEMANTIC_WEIGHT,
      ),
      source: 'semantic',
      rank,
    })
  }

  const rankedMatches = [...rankedRecordMap.values()].map((rankedMatch) => {
    const overlapBoost =
      rankedMatch.lexicalRank !== null && rankedMatch.semanticRank !== null
        ? CHAT_RETRIEVAL_FUSION.OVERLAP_BOOST
        : 0
    const sourceCategoryBoost = preferredSourceCategorySet.has(
      rankedMatch.sourceCategory,
    )
      ? CHAT_RETRIEVAL_FUSION.SOURCE_CATEGORY_BOOST
      : 0
    const currentPostBoost =
      currentPostSlug && rankedMatch.slug === currentPostSlug
        ? CHAT_RETRIEVAL_FUSION.CURRENT_POST_BOOST
        : 0

    return {
      ...rankedMatch,
      score:
        rankedMatch.score +
        overlapBoost +
        sourceCategoryBoost +
        currentPostBoost,
    }
  })

  return rankedMatches
    .sort((leftMatch, rightMatch) => {
      return (
        rightMatch.score - leftMatch.score ||
        (leftMatch.lexicalRank ?? Number.MAX_SAFE_INTEGER) -
          (rightMatch.lexicalRank ?? Number.MAX_SAFE_INTEGER) ||
        (leftMatch.semanticRank ?? Number.MAX_SAFE_INTEGER) -
          (rightMatch.semanticRank ?? Number.MAX_SAFE_INTEGER) ||
        buildPublishedAtTimestamp(rightMatch) -
          buildPublishedAtTimestamp(leftMatch)
      )
    })
    .slice(0, BLOG_CHAT.SEARCH.TOP_K)
    .map(({ score, lexicalRank, semanticRank, ...match }) => {
      return match
    })
}
