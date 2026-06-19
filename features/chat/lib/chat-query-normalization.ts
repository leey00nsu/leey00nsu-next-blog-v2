import { LOCALES, type SupportedLocale } from '@/shared/config/constants'
import { SEMANTIC_SEARCH } from '@/shared/config/search-terms'

export interface ChatQueryNormalizationResult {
  normalizedQuestion: string
  normalizedSearchQuestion: string
  queryTokens: string[]
}

const CHAT_QUERY_NORMALIZATION = {
  PATTERNS: {
    PUNCTUATION: /[?!,]+/g,
    WHITESPACE: /\s+/g,
    LATIN_TO_HANGUL: /([A-Za-z])([가-힣])/g,
    HANGUL_TO_LATIN: /([가-힣])([A-Za-z])/g,
    WORD: /[\p{L}\p{N}][\p{L}\p{N}+#.-]*/gu,
  },
  STOP_WORDS: {
    ko: ['알아', '뭐야', '뭔데', '알려줘', '알려', '대해', '관련'],
    en: ['know', 'about', 'what', 'is', 'tell', 'me'],
  },
} as const

function normalizeSearchText(text: string): string {
  return text
    .replaceAll(CHAT_QUERY_NORMALIZATION.PATTERNS.LATIN_TO_HANGUL, '$1 $2')
    .replaceAll(CHAT_QUERY_NORMALIZATION.PATTERNS.HANGUL_TO_LATIN, '$1 $2')
}

function resolveStopWords(locale: SupportedLocale): Set<string> {
  return new Set([
    ...SEMANTIC_SEARCH.STOP_WORDS.en,
    ...SEMANTIC_SEARCH.STOP_WORDS.ko,
    ...CHAT_QUERY_NORMALIZATION.STOP_WORDS[locale],
    ...CHAT_QUERY_NORMALIZATION.STOP_WORDS[LOCALES.DEFAULT],
  ])
}

function tokenizeSearchText(text: string, locale: SupportedLocale): string[] {
  const stopWords = resolveStopWords(locale)

  return (
    normalizeSearchText(text)
      .toLowerCase()
      .match(CHAT_QUERY_NORMALIZATION.PATTERNS.WORD) ?? []
  ).filter((token) => {
    return token.length >= 2 && !stopWords.has(token)
  })
}

function buildNormalizedSearchQuestion(params: {
  locale: SupportedLocale
  normalizedQuestion: string
}): string {
  const stopWords = resolveStopWords(params.locale)
  const preservedTokens = params.normalizedQuestion
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => {
      return !stopWords.has(token.toLowerCase())
    })

  return preservedTokens.join(' ') || params.normalizedQuestion
}

export function normalizeQuestionText(question: string): string {
  return question
    .trim()
    .replaceAll(CHAT_QUERY_NORMALIZATION.PATTERNS.PUNCTUATION, ' ')
    .replaceAll(CHAT_QUERY_NORMALIZATION.PATTERNS.WHITESPACE, ' ')
    .trim()
}

export function normalizeChatQuery(params: {
  question: string
  locale?: SupportedLocale
}): ChatQueryNormalizationResult {
  const locale = params.locale ?? LOCALES.DEFAULT
  const normalizedQuestion = normalizeQuestionText(params.question)
  const normalizedSearchQuestion = buildNormalizedSearchQuestion({
    locale,
    normalizedQuestion,
  })

  return {
    normalizedQuestion,
    normalizedSearchQuestion,
    queryTokens: [
      ...new Set(tokenizeSearchText(normalizedSearchQuestion, locale)),
    ],
  }
}
