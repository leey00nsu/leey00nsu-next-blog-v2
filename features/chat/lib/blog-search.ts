import { BLOG_CHAT } from '@/features/chat/config/constants'
import { CHAT_QUESTION_RULES } from '@/features/chat/config/question-rules'
import type { BlogSearchRecord } from '@/entities/post/model/search-types'
import type { SupportedLocale } from '@/shared/config/constants'

interface SelectBlogSearchMatchesParams {
  question: string
  locale: SupportedLocale
  records: BlogSearchRecord[]
  currentPostSlug?: string
}

interface ScoredBlogSearchRecord extends BlogSearchRecord {
  score: number
  matchedTokenCount: number
}

export interface BlogSearchSelectionResult {
  grounded: boolean
  matches: BlogSearchRecord[]
  refusalReason?: 'insufficient_search_match'
}

const TOKEN_PATTERNS = {
  WORD: /[\p{L}\p{N}][\p{L}\p{N}+#.-]*/gu,
} as const

const SCRIPT_BOUNDARY_PATTERNS = {
  LATIN_TO_HANGUL: /([A-Za-z])([가-힣])/g,
  HANGUL_TO_LATIN: /([가-힣])([A-Za-z])/g,
} as const

function normalizeText(text: string): string {
  return text
    .replaceAll(SCRIPT_BOUNDARY_PATTERNS.LATIN_TO_HANGUL, '$1 $2')
    .replaceAll(SCRIPT_BOUNDARY_PATTERNS.HANGUL_TO_LATIN, '$1 $2')
    .toLowerCase()
}

function tokenizeText(text: string): string[] {
  const matches = normalizeText(text).match(TOKEN_PATTERNS.WORD) ?? []

  return [...new Set(matches.filter((token) => token.length >= 2))]
}

function buildExpandedTokens(baseTokens: string[]): string[] {
  const expandedTokens = new Set(baseTokens)

  for (const token of baseTokens) {
    const aliases =
      CHAT_QUESTION_RULES.TERM_EXPANSIONS[
        token as keyof typeof CHAT_QUESTION_RULES.TERM_EXPANSIONS
      ] ?? []

    for (const alias of aliases) {
      for (const aliasToken of tokenizeText(alias)) {
        expandedTokens.add(aliasToken)
      }
    }
  }

  return [...expandedTokens]
}

function resolveMinimumMatchedTokenCount(questionTokens: string[]): number {
  if (questionTokens.length <= 1) {
    return 1
  }

  return BLOG_CHAT.SEARCH.MINIMUM_MATCHED_TOKEN_COUNT
}

function resolveMinimumScore(questionTokens: string[]): number {
  if (questionTokens.length <= 1) {
    return BLOG_CHAT.SEARCH.FIELD_SCORE.CONTENT
  }

  return BLOG_CHAT.SEARCH.MINIMUM_SCORE
}

function isContextDrivenQuestion(question: string): boolean {
  return CHAT_QUESTION_RULES.CONTEXT_QUERY_PATTERNS.some((queryPattern) => {
    return question.includes(queryPattern)
  })
}

function buildDocumentFrequencyMap(
  questionTokens: string[],
  records: BlogSearchRecord[],
): Map<string, number> {
  const documentFrequencyMap = new Map<string, number>()

  for (const questionToken of questionTokens) {
    const frequency = records.reduce((count, record) => {
      const combinedText = normalizeText(
        [
          record.title,
          record.sectionTitle ?? '',
          record.content,
          record.tags.join(' '),
        ].join(' '),
      )

      return combinedText.includes(questionToken) ? count + 1 : count
    }, 0)

    documentFrequencyMap.set(questionToken, frequency)
  }

  return documentFrequencyMap
}

function calculateTokenWeight(
  token: string,
  documentFrequencyMap: Map<string, number>,
  totalRecordCount: number,
): number {
  const documentFrequency = documentFrequencyMap.get(token) ?? 0

  return 1 + Math.log2((1 + totalRecordCount) / (1 + documentFrequency))
}

function buildFieldMatchMultiplier(record: BlogSearchRecord, token: string): number {
  const normalizedTitle = normalizeText(record.title)
  const normalizedSectionTitle = normalizeText(record.sectionTitle ?? '')
  const normalizedContent = normalizeText(record.content)
  const normalizedTags = normalizeText(record.tags.join(' '))

  if (normalizedSectionTitle.includes(token)) {
    return BLOG_CHAT.SEARCH.FIELD_SCORE.SECTION
  }

  if (normalizedTitle.includes(token)) {
    return BLOG_CHAT.SEARCH.FIELD_SCORE.TITLE
  }

  if (normalizedContent.includes(token)) {
    return BLOG_CHAT.SEARCH.FIELD_SCORE.CONTENT
  }

  if (normalizedTags.includes(token)) {
    return BLOG_CHAT.SEARCH.FIELD_SCORE.TAG
  }

  return 0
}

function countMatchedTokens(tokens: string[], text: string): number {
  const normalizedText = normalizeText(text)

  return tokens.reduce((count, token) => {
    return normalizedText.includes(token) ? count + 1 : count
  }, 0)
}

function scoreRecord(
  questionTokens: string[],
  record: BlogSearchRecord,
  documentFrequencyMap: Map<string, number>,
  totalRecordCount: number,
): ScoredBlogSearchRecord | null {
  const matchedTokenCount = countMatchedTokens(
    questionTokens,
    [record.title, record.sectionTitle, record.content, record.tags.join(' ')]
      .filter(Boolean)
      .join(' '),
  )

  const score = questionTokens.reduce((totalScore, questionToken) => {
    const fieldMatchMultiplier = buildFieldMatchMultiplier(record, questionToken)

    if (fieldMatchMultiplier === 0) {
      return totalScore
    }

    return (
      totalScore +
      calculateTokenWeight(
        questionToken,
        documentFrequencyMap,
        totalRecordCount,
      ) *
        fieldMatchMultiplier
    )
  }, 0)

  if (matchedTokenCount === 0 || score === 0) {
    return null
  }

  return {
    ...record,
    score,
    matchedTokenCount,
  }
}

function limitMatchesPerSlug(
  matches: ScoredBlogSearchRecord[],
): ScoredBlogSearchRecord[] {
  const slugCountMap = new Map<string, number>()
  const limitedMatches: ScoredBlogSearchRecord[] = []

  for (const match of matches) {
    const slugCount = slugCountMap.get(match.slug) ?? 0

    if (slugCount >= BLOG_CHAT.SEARCH.MAXIMUM_MATCHES_PER_SLUG) {
      continue
    }

    slugCountMap.set(match.slug, slugCount + 1)
    limitedMatches.push(match)
  }

  return limitedMatches
}

function selectCurrentPostFallbackMatches(
  currentPostSlug: string,
  records: BlogSearchRecord[],
): BlogSearchRecord[] {
  return records
    .filter((record) => record.slug === currentPostSlug)
    .sort((leftRecord, rightRecord) => {
      if (leftRecord.sectionTitle === null && rightRecord.sectionTitle !== null) {
        return -1
      }

      if (leftRecord.sectionTitle !== null && rightRecord.sectionTitle === null) {
        return 1
      }

      return 0
    })
    .slice(0, BLOG_CHAT.SEARCH.TOP_K)
}

export function selectBlogSearchMatches({
  question,
  locale,
  records,
  currentPostSlug,
}: SelectBlogSearchMatchesParams): BlogSearchSelectionResult {
  const scopedRecords = records.filter((record) => record.locale === locale)
  const baseQuestionTokens = tokenizeText(question)
  const questionTokens = buildExpandedTokens(baseQuestionTokens)
  const minimumMatchedTokenCount =
    resolveMinimumMatchedTokenCount(baseQuestionTokens)
  const minimumScore = resolveMinimumScore(baseQuestionTokens)
  const documentFrequencyMap = buildDocumentFrequencyMap(
    questionTokens,
    scopedRecords,
  )

  const scoredMatches = (
    scopedRecords
      .map((record) =>
        scoreRecord(
          questionTokens,
          record,
          documentFrequencyMap,
          scopedRecords.length,
        ),
      )
      .filter(Boolean) as ScoredBlogSearchRecord[]
  )
    .filter((record) => {
      return (
        record.score >= minimumScore &&
        record.matchedTokenCount >= minimumMatchedTokenCount
      )
    })
    .sort((leftRecord, rightRecord) => rightRecord.score - leftRecord.score)

  const limitedMatches = limitMatchesPerSlug(scoredMatches).slice(
    0,
    BLOG_CHAT.SEARCH.TOP_K,
  )

  if (limitedMatches.length === 0) {
    if (currentPostSlug && isContextDrivenQuestion(question)) {
      const currentPostFallbackMatches = selectCurrentPostFallbackMatches(
        currentPostSlug,
        scopedRecords,
      )

      if (currentPostFallbackMatches.length > 0) {
        return {
          grounded: true,
          matches: currentPostFallbackMatches,
        }
      }
    }

    return {
      grounded: false,
      matches: [],
      refusalReason: 'insufficient_search_match',
    }
  }

  return {
    grounded: true,
    matches: limitedMatches.map(({ score, matchedTokenCount, ...record }) => {
      return record
    }),
  }
}
