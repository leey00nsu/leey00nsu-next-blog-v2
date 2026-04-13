import type { ChatSourceCategory } from '@/features/chat/model/chat-evidence'
import {
  LOCALES,
  type SupportedLocale,
} from '@/shared/config/constants'
import { SEMANTIC_SEARCH } from '@/shared/config/search-terms'

export interface ChatQueryNormalizationResult {
  normalizedQuestion: string
  normalizedSearchQuestion: string
  queryTokens: string[]
  additionalKeywords: string[]
  preferredSourceCategories: ChatSourceCategory[]
}

const CHAT_QUERY_NORMALIZATION = {
  NORMALIZATION_PATTERNS: {
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
  SOURCE_CATEGORY_HINT_PATTERNS: {
    blog: {
      ko: ['글', '포스트', '게시글', '문서'],
      en: ['post', 'blog post', 'article'],
    },
    profile: {
      ko: ['프로필', '소개 페이지', '작성자', '개발자', '경력', '학력'],
      en: ['profile', 'about page', 'author', 'developer', 'career'],
    },
    project: {
      ko: ['프로젝트', '서비스', '도구', '라이브러리', '앱'],
      en: ['project', 'service', 'tool', 'library', 'app'],
    },
    assistant: {
      ko: ['챗봇', '봇'],
      en: ['chatbot', 'assistant', 'bot'],
    },
  },
  SOURCE_CATEGORY_KEYWORDS: {
    blog: ['blog', 'post', 'posts', '글', '포스트'],
    profile: ['profile', 'about', 'author', '소개', '프로필', '작성자'],
    project: ['project', 'projects', '프로젝트'],
    assistant: ['assistant', 'chatbot', '챗봇'],
  },
} as const

function normalizeSearchText(text: string): string {
  return text
    .replaceAll(
      CHAT_QUERY_NORMALIZATION.NORMALIZATION_PATTERNS.LATIN_TO_HANGUL,
      '$1 $2',
    )
    .replaceAll(
      CHAT_QUERY_NORMALIZATION.NORMALIZATION_PATTERNS.HANGUL_TO_LATIN,
      '$1 $2',
    )
}

function resolveTokenStopWords(locale: SupportedLocale): Set<string> {
  return new Set([
    ...SEMANTIC_SEARCH.STOP_WORDS.en,
    ...SEMANTIC_SEARCH.STOP_WORDS.ko,
    ...CHAT_QUERY_NORMALIZATION.STOP_WORDS[locale],
    ...CHAT_QUERY_NORMALIZATION.STOP_WORDS[LOCALES.DEFAULT],
  ])
}

function tokenizeSearchText(
  text: string,
  locale: SupportedLocale,
): string[] {
  const stopWords = resolveTokenStopWords(locale)

  return (normalizeSearchText(text)
    .toLowerCase()
    .match(CHAT_QUERY_NORMALIZATION.NORMALIZATION_PATTERNS.WORD) ?? []
  ).filter((token) => {
    return token.length >= 2 && !stopWords.has(token)
  })
}

function resolveStopWords(locale: SupportedLocale): Set<string> {
  return new Set([
    ...CHAT_QUERY_NORMALIZATION.STOP_WORDS[locale],
    ...CHAT_QUERY_NORMALIZATION.STOP_WORDS[LOCALES.DEFAULT],
  ])
}

function resolveCategoryPatterns(
  category: ChatSourceCategory,
  locale: SupportedLocale,
): string[] {
  return [
    ...CHAT_QUERY_NORMALIZATION.SOURCE_CATEGORY_HINT_PATTERNS[category][locale],
    ...CHAT_QUERY_NORMALIZATION.SOURCE_CATEGORY_HINT_PATTERNS[category][
      LOCALES.DEFAULT
    ],
  ]
}

function resolvePreferredSourceCategories(params: {
  locale: SupportedLocale
  normalizedQuestion: string
}): ChatSourceCategory[] {
  return (
    [
      'blog',
      'profile',
      'project',
      'assistant',
    ] as const satisfies ChatSourceCategory[]
  ).filter((category) => {
    return resolveCategoryPatterns(category, params.locale).some((pattern) => {
      return params.normalizedQuestion.toLowerCase().includes(pattern)
    })
  })
}

function buildAdditionalKeywords(
  preferredSourceCategories: ChatSourceCategory[],
): string[] {
  return [
    ...new Set(
      preferredSourceCategories.flatMap((preferredSourceCategory) => {
        return CHAT_QUERY_NORMALIZATION.SOURCE_CATEGORY_KEYWORDS[
          preferredSourceCategory
        ]
      }),
    ),
  ]
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
    .replaceAll(CHAT_QUERY_NORMALIZATION.NORMALIZATION_PATTERNS.PUNCTUATION, ' ')
    .replaceAll(CHAT_QUERY_NORMALIZATION.NORMALIZATION_PATTERNS.WHITESPACE, ' ')
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
  const preferredSourceCategories = resolvePreferredSourceCategories({
    locale,
    normalizedQuestion,
  })

  return {
    normalizedQuestion,
    normalizedSearchQuestion,
    queryTokens: [
      ...new Set(tokenizeSearchText(normalizedSearchQuestion, locale)),
    ],
    additionalKeywords: buildAdditionalKeywords(preferredSourceCategories),
    preferredSourceCategories,
  }
}
