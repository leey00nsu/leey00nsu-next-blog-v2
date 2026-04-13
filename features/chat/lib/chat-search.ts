import { BLOG_CHAT } from '@/features/chat/config/constants'
import { CHAT_QUESTION_RULES } from '@/features/chat/config/question-rules'
import { normalizeChatQuery } from '@/features/chat/lib/chat-query-normalization'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import type { SupportedLocale } from '@/shared/config/constants'

interface SelectChatSearchMatchesParams {
  question: string
  locale: SupportedLocale
  records: ChatEvidenceRecord[]
  additionalKeywords?: string[]
  preferredSourceCategories?: ChatEvidenceRecord['sourceCategory'][]
  currentPostSlug?: string
}

interface ScoredChatEvidenceRecord extends ChatEvidenceRecord {
  score: number
  matchedTokenCount: number
}

export interface ChatSearchSelectionResult {
  grounded: boolean
  matches: ChatEvidenceRecord[]
  refusalReason?: 'insufficient_search_match'
}

const TOKEN_PATTERNS = {
  WORD: /[\p{L}\p{N}][\p{L}\p{N}+#.-]*/gu,
} as const

const SCRIPT_BOUNDARY_PATTERNS = {
  LATIN_TO_HANGUL: /([A-Za-z])([가-힣])/g,
  HANGUL_TO_LATIN: /([가-힣])([A-Za-z])/g,
} as const

const CHAT_SEARCH_QUERY_PATTERNS = {
  RECENCY: ['최신', '최근', 'latest', 'recent'],
  RECOMMENDATION: [
    '추천',
    '추천해',
    '추천해줘',
    '추천해달라',
    'recommend',
    'recommended',
  ],
} as const

function normalizeText(text: string): string {
  return text
    .replaceAll(SCRIPT_BOUNDARY_PATTERNS.LATIN_TO_HANGUL, '$1 $2')
    .replaceAll(SCRIPT_BOUNDARY_PATTERNS.HANGUL_TO_LATIN, '$1 $2')
    .toLowerCase()
}

function tokenizeText(text: string): string[] {
  return [
    ...new Set(
      (normalizeText(text).match(TOKEN_PATTERNS.WORD) ?? []).filter((token) => {
        return token.length >= 2
      }),
    ),
  ]
}

function containsQueryPattern(
  normalizedQuestion: string,
  patterns: readonly string[],
): boolean {
  return patterns.some((pattern) => {
    return normalizedQuestion.includes(pattern)
  })
}

function buildExpandedTokens(
  baseTokens: string[],
  additionalKeywords: string[],
): string[] {
  const expandedTokens = new Set(baseTokens)

  for (const token of [...baseTokens, ...tokenizeText(additionalKeywords.join(' '))]) {
    expandedTokens.add(token)

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

function buildDocumentFrequencyMap(
  questionTokens: string[],
  records: ChatEvidenceRecord[],
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
          (record.searchTerms ?? []).join(' '),
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

function buildFieldMatchMultiplier(
  record: ChatEvidenceRecord,
  token: string,
): number {
  const normalizedTitle = normalizeText(record.title)
  const normalizedSectionTitle = normalizeText(record.sectionTitle ?? '')
  const normalizedContent = normalizeText(record.content)
  const normalizedTags = normalizeText(record.tags.join(' '))
  const normalizedSearchTerms = normalizeText((record.searchTerms ?? []).join(' '))

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

  if (normalizedSearchTerms.includes(token)) {
    return BLOG_CHAT.SEARCH.FIELD_SCORE.TAG
  }

  return 0
}

function countMatchedTokens(tokens: string[], text: string): number {
  const normalizedRecordText = normalizeText(text)

  return tokens.reduce((count, token) => {
    return normalizedRecordText.includes(token) ? count + 1 : count
  }, 0)
}

function buildExactTitleMatchBoost(params: {
  record: ChatEvidenceRecord
  normalizedQuestion: string
  baseQuestionTokens: string[]
}): number {
  const normalizedTitle = normalizeText(params.record.title).trim()

  if (!normalizedTitle) {
    return 0
  }

  if (params.normalizedQuestion === normalizedTitle) {
    return BLOG_CHAT.SEARCH.EXACT_TITLE_MATCH_BOOST
  }

  const titleTokens = tokenizeText(params.record.title)

  if (titleTokens.length === 0 || titleTokens.length > params.baseQuestionTokens.length) {
    return 0
  }

  return titleTokens.every((titleToken) => {
    return params.baseQuestionTokens.includes(titleToken)
  })
    ? BLOG_CHAT.SEARCH.EXACT_TITLE_MATCH_BOOST
    : 0
}

function resolveMinimumMatchedTokenCount(params: {
  questionTokens: string[]
  additionalKeywords: string[]
  preferredSourceCategories: ChatEvidenceRecord['sourceCategory'][]
  normalizedQuestion: string
}): number {
  const {
    questionTokens,
    additionalKeywords,
    preferredSourceCategories,
    normalizedQuestion,
  } = params

  if (questionTokens.length <= 1) {
    return 1
  }

  if (
    containsQueryPattern(
      normalizedQuestion,
      CHAT_SEARCH_QUERY_PATTERNS.RECOMMENDATION,
    ) ||
    containsQueryPattern(normalizedQuestion, CHAT_SEARCH_QUERY_PATTERNS.RECENCY)
  ) {
    return 1
  }

  if (
    additionalKeywords.length > 0 ||
    preferredSourceCategories.length > 0
  ) {
    return 1
  }

  return BLOG_CHAT.SEARCH.MINIMUM_MATCHED_TOKEN_COUNT
}

function resolveMinimumScore(
  questionTokens: string[],
  normalizedQuestion: string,
): number {
  if (
    containsQueryPattern(
      normalizedQuestion,
      CHAT_SEARCH_QUERY_PATTERNS.RECOMMENDATION,
    ) ||
    containsQueryPattern(normalizedQuestion, CHAT_SEARCH_QUERY_PATTERNS.RECENCY)
  ) {
    return BLOG_CHAT.SEARCH.FIELD_SCORE.TAG
  }

  if (questionTokens.length <= 1) {
    return BLOG_CHAT.SEARCH.FIELD_SCORE.CONTENT
  }

  if (questionTokens.length <= 4) {
    return BLOG_CHAT.SEARCH.FIELD_SCORE.TITLE
  }

  return BLOG_CHAT.SEARCH.MINIMUM_SCORE
}

function isContextDrivenQuestion(question: string): boolean {
  return CHAT_QUESTION_RULES.CONTEXT_QUERY_PATTERNS.some((queryPattern) => {
    return question.includes(queryPattern)
  })
}

function resolvePublishedAtTimestamp(record: ChatEvidenceRecord): number {
  if (!record.publishedAt) {
    return 0
  }

  const timestamp = new Date(record.publishedAt).getTime()

  return Number.isNaN(timestamp) ? 0 : timestamp
}

function shouldSortByRecency(normalizedQuestion: string): boolean {
  return containsQueryPattern(
    normalizedQuestion,
    CHAT_SEARCH_QUERY_PATTERNS.RECENCY,
  )
}

function scoreRecord(
  questionTokens: string[],
  baseQuestionTokens: string[],
  normalizedQuestion: string,
  record: ChatEvidenceRecord,
  documentFrequencyMap: Map<string, number>,
  totalRecordCount: number,
  preferredSourceCategories: ChatEvidenceRecord['sourceCategory'][],
): ScoredChatEvidenceRecord | null {
  const matchedTokenCount = countMatchedTokens(
    questionTokens,
    [
      record.title,
      record.sectionTitle,
      record.content,
      record.tags.join(' '),
      (record.searchTerms ?? []).join(' '),
    ]
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

  const sourceCategoryBoost = preferredSourceCategories.includes(
    record.sourceCategory,
  )
    ? BLOG_CHAT.SEARCH.SOURCE_CATEGORY_BOOST
    : 0
  const exactTitleMatchBoost = buildExactTitleMatchBoost({
    record,
    normalizedQuestion,
    baseQuestionTokens,
  })

  return {
    ...record,
    score: score + sourceCategoryBoost + exactTitleMatchBoost,
    matchedTokenCount,
  }
}

function limitMatchesPerSlug(
  matches: ScoredChatEvidenceRecord[],
): ScoredChatEvidenceRecord[] {
  const slugCountMap = new Map<string, number>()
  const limitedMatches: ScoredChatEvidenceRecord[] = []

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
  records: ChatEvidenceRecord[],
): ChatEvidenceRecord[] {
  return records
    .filter((record) => {
      return (
        record.slug === currentPostSlug && record.sourceCategory === 'blog'
      )
    })
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

export function selectChatSearchMatches({
  question,
  locale,
  records,
  additionalKeywords = [],
  preferredSourceCategories = [],
  currentPostSlug,
}: SelectChatSearchMatchesParams): ChatSearchSelectionResult {
  const scopedRecords = records.filter((record) => record.locale === locale)
  const normalizedQuery = normalizeChatQuery({
    question,
    locale,
  })
  const normalizedQuestion = normalizeText(normalizedQuery.normalizedSearchQuestion)
  const baseQuestionTokens = normalizedQuery.queryTokens
  const questionTokens = buildExpandedTokens(baseQuestionTokens, [
    ...normalizedQuery.additionalKeywords,
    ...additionalKeywords,
  ])
  const minimumMatchedTokenCount = resolveMinimumMatchedTokenCount({
    questionTokens: baseQuestionTokens,
    additionalKeywords: [
      ...normalizedQuery.additionalKeywords,
      ...additionalKeywords,
    ],
    preferredSourceCategories,
    normalizedQuestion,
  })
  const minimumScore = resolveMinimumScore(baseQuestionTokens, normalizedQuestion)
  const documentFrequencyMap = buildDocumentFrequencyMap(
    questionTokens,
    scopedRecords,
  )

  const scoredMatches = (
    scopedRecords
      .map((record) =>
        scoreRecord(
          questionTokens,
          baseQuestionTokens,
          normalizedQuestion,
          record,
          documentFrequencyMap,
          scopedRecords.length,
          preferredSourceCategories,
        ),
      )
      .filter(Boolean) as ScoredChatEvidenceRecord[]
  )
    .filter((record) => {
      return (
        record.score >= minimumScore &&
        record.matchedTokenCount >= minimumMatchedTokenCount
      )
    })
    .sort((leftRecord, rightRecord) => {
      if (shouldSortByRecency(normalizedQuestion)) {
        return (
          resolvePublishedAtTimestamp(rightRecord) -
            resolvePublishedAtTimestamp(leftRecord) ||
          rightRecord.score - leftRecord.score
        )
      }

      return rightRecord.score - leftRecord.score
    })

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
