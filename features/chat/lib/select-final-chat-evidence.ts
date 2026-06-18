import { BLOG_CHAT } from '@/features/chat/config/constants'
import { normalizeChatQuery } from '@/features/chat/lib/chat-query-normalization'
import { selectEvidenceCoveringRequiredConcepts } from '@/features/chat/lib/chat-required-concepts'
import type { ChatResolvedEvidenceScope } from '@/features/chat/lib/chat-retrieval-scope'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import type { NormalizedChatIntent } from '@/features/chat/model/chat-intent'
import type { SupportedLocale } from '@/shared/config/constants'

interface SelectFinalChatEvidenceParams {
  question: string
  locale: SupportedLocale
  intent: NormalizedChatIntent
  evidenceScope: ChatResolvedEvidenceScope
  lexicalMatches: ChatEvidenceRecord[]
  semanticMatches: ChatEvidenceRecord[]
}

interface SelectFinalChatEvidenceByMeaningParams {
  question: string
  standaloneQuestion: string
  locale: SupportedLocale
  evidenceScope: ChatResolvedEvidenceScope
  lexicalMatches: ChatEvidenceRecord[]
  semanticMatches: ChatEvidenceRecord[]
  preferredSourceCategories: ChatEvidenceRecord['sourceCategory'][]
  rankingConcepts: string[]
  requiredConcepts: string[]
}

interface RankedChatEvidenceRecord extends ChatEvidenceRecord {
  score: number
  lexicalRank: number | null
  semanticRank: number | null
}

const FINAL_EVIDENCE_SELECTION = {
  LEXICAL_BASE_SCORE: 28,
  SEMANTIC_BASE_SCORE: 20,
  OVERLAP_BOOST: 12,
  PREFERRED_SOURCE_CATEGORY_BOOST: 8,
  TARGET_SOURCE_CATEGORY_BOOST: 6,
  TARGET_SLUG_BOOST: 12,
  TARGET_TITLE_BOOST: 8,
  TITLE_TOKEN_SCORE: 5,
  SECTION_TOKEN_SCORE: 6,
  SEARCH_TERM_TOKEN_SCORE: 5,
  TAG_TOKEN_SCORE: 3,
  CONTENT_TOKEN_SCORE: 1.5,
} as const

function normalizeText(text: string): string {
  return text.toLowerCase()
}

function countTokenMatches(tokens: string[], text: string): number {
  const normalizedText = normalizeText(text)

  return tokens.reduce((count, token) => {
    return normalizedText.includes(token) ? count + 1 : count
  }, 0)
}

function buildQuestionTokens(params: {
  question: string
  locale: SupportedLocale
  standaloneQuestion: string
  rankingConcepts: string[]
}): string[] {
  const normalizedQuestion = normalizeChatQuery({
    question: params.question,
    locale: params.locale,
  })
  const normalizedStandaloneQuestion = normalizeChatQuery({
    question: params.standaloneQuestion,
    locale: params.locale,
  })
  const normalizedKeywords = normalizeChatQuery({
    question: params.rankingConcepts.join(' '),
    locale: params.locale,
  })

  return [
    ...new Set([
      ...normalizedQuestion.queryTokens,
      ...normalizedStandaloneQuestion.queryTokens,
      ...normalizedKeywords.queryTokens,
    ]),
  ]
}

function buildLexicalQualityScore(params: {
  match: ChatEvidenceRecord
  questionTokens: string[]
}): number {
  return (
    countTokenMatches(params.questionTokens, params.match.title) *
      FINAL_EVIDENCE_SELECTION.TITLE_TOKEN_SCORE +
    countTokenMatches(params.questionTokens, params.match.sectionTitle ?? '') *
      FINAL_EVIDENCE_SELECTION.SECTION_TOKEN_SCORE +
    countTokenMatches(
      params.questionTokens,
      (params.match.searchTerms ?? []).join(' '),
    ) *
      FINAL_EVIDENCE_SELECTION.SEARCH_TERM_TOKEN_SCORE +
    countTokenMatches(params.questionTokens, params.match.tags.join(' ')) *
      FINAL_EVIDENCE_SELECTION.TAG_TOKEN_SCORE +
    countTokenMatches(params.questionTokens, params.match.content) *
      FINAL_EVIDENCE_SELECTION.CONTENT_TOKEN_SCORE
  )
}

function buildTargetScore(params: {
  match: ChatEvidenceRecord
  evidenceScope: ChatResolvedEvidenceScope
}): number {
  const sourceCategoryScore =
    params.evidenceScope.sourceCategory &&
    params.match.sourceCategory === params.evidenceScope.sourceCategory
      ? FINAL_EVIDENCE_SELECTION.TARGET_SOURCE_CATEGORY_BOOST
      : 0
  const slugScore =
    params.evidenceScope.slug && params.match.slug === params.evidenceScope.slug
      ? FINAL_EVIDENCE_SELECTION.TARGET_SLUG_BOOST
      : 0
  const titleScore =
    params.evidenceScope.title &&
    normalizeText(params.match.title).includes(
      normalizeText(params.evidenceScope.title),
    )
      ? FINAL_EVIDENCE_SELECTION.TARGET_TITLE_BOOST
      : 0

  return sourceCategoryScore + slugScore + titleScore
}

function upsertRankedMatch(params: {
  rankedMatchMap: Map<string, RankedChatEvidenceRecord>
  match: ChatEvidenceRecord
  score: number
  lexicalRank: number | null
  semanticRank: number | null
}): void {
  const existingMatch = params.rankedMatchMap.get(params.match.id)

  if (!existingMatch) {
    params.rankedMatchMap.set(params.match.id, {
      ...params.match,
      score: params.score,
      lexicalRank: params.lexicalRank,
      semanticRank: params.semanticRank,
    })

    return
  }

  params.rankedMatchMap.set(params.match.id, {
    ...existingMatch,
    score:
      existingMatch.score +
      params.score +
      FINAL_EVIDENCE_SELECTION.OVERLAP_BOOST,
    lexicalRank: params.lexicalRank ?? existingMatch.lexicalRank,
    semanticRank: params.semanticRank ?? existingMatch.semanticRank,
  })
}

function selectFinalChatEvidenceByMeaning({
  question,
  standaloneQuestion,
  locale,
  evidenceScope,
  lexicalMatches,
  semanticMatches,
  preferredSourceCategories,
  rankingConcepts,
  requiredConcepts,
}: SelectFinalChatEvidenceByMeaningParams): ChatEvidenceRecord[] {
  const rankedMatchMap = new Map<string, RankedChatEvidenceRecord>()
  const questionTokens = buildQuestionTokens({
    question,
    locale,
    standaloneQuestion,
    rankingConcepts,
  })
  const preferredSourceCategorySet = new Set(preferredSourceCategories)

  for (const [rank, match] of semanticMatches.entries()) {
    upsertRankedMatch({
      rankedMatchMap,
      match,
      score:
        FINAL_EVIDENCE_SELECTION.SEMANTIC_BASE_SCORE -
        rank +
        buildLexicalQualityScore({ match, questionTokens }) +
        buildTargetScore({ match, evidenceScope }) +
        (preferredSourceCategorySet.has(match.sourceCategory)
          ? FINAL_EVIDENCE_SELECTION.PREFERRED_SOURCE_CATEGORY_BOOST
          : 0),
      lexicalRank: null,
      semanticRank: rank,
    })
  }

  for (const [rank, match] of lexicalMatches.entries()) {
    upsertRankedMatch({
      rankedMatchMap,
      match,
      score:
        FINAL_EVIDENCE_SELECTION.LEXICAL_BASE_SCORE -
        rank +
        buildLexicalQualityScore({ match, questionTokens }) +
        buildTargetScore({ match, evidenceScope }) +
        (preferredSourceCategorySet.has(match.sourceCategory)
          ? FINAL_EVIDENCE_SELECTION.PREFERRED_SOURCE_CATEGORY_BOOST
          : 0),
      lexicalRank: rank,
      semanticRank: null,
    })
  }

  const rankedMatches = [...rankedMatchMap.values()]
    .filter((match) => {
      if (
        evidenceScope.mode !== 'current_source' ||
        !evidenceScope.slug ||
        !evidenceScope.sourceCategory
      ) {
        return true
      }

      return (
        match.slug === evidenceScope.slug &&
        match.sourceCategory === evidenceScope.sourceCategory
      )
    })
    .sort((leftMatch, rightMatch) => {
      return (
        rightMatch.score - leftMatch.score ||
        (leftMatch.lexicalRank ?? Number.MAX_SAFE_INTEGER) -
          (rightMatch.lexicalRank ?? Number.MAX_SAFE_INTEGER) ||
        (leftMatch.semanticRank ?? Number.MAX_SAFE_INTEGER) -
          (rightMatch.semanticRank ?? Number.MAX_SAFE_INTEGER)
      )
    })
    .map(({ score, lexicalRank, semanticRank, ...match }) => {
      return match
    })

  return selectEvidenceCoveringRequiredConcepts({
    matches: rankedMatches,
    requiredConcepts,
    locale,
  }).slice(0, BLOG_CHAT.SEARCH.TOP_K)
}

export function selectFinalChatEvidence({
  question,
  locale,
  intent,
  evidenceScope,
  lexicalMatches,
  semanticMatches,
}: SelectFinalChatEvidenceParams): ChatEvidenceRecord[] {
  return selectFinalChatEvidenceByMeaning({
    question,
    standaloneQuestion: intent.standaloneQuestion,
    locale,
    evidenceScope,
    lexicalMatches,
    semanticMatches,
    preferredSourceCategories: intent.target.sourceCategory
      ? [intent.target.sourceCategory]
      : [],
    rankingConcepts: [...intent.requiredConcepts, ...intent.optionalConcepts],
    requiredConcepts: intent.requiredConcepts,
  })
}
