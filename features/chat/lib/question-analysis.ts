import { CHAT_QUESTION_RULES } from '@/features/chat/config/question-rules'
import type { ChatSourceCategory } from '@/features/chat/model/chat-evidence'
import {
  normalizeChatQuery,
  normalizeQuestionText,
} from '@/features/chat/lib/chat-query-normalization'
import {
  LOCALES,
  type SupportedLocale,
} from '@/shared/config/constants'

export const CHAT_QUESTION_TYPES = [
  'greeting',
  'assistant-identity',
  'general',
] as const

export type ChatQuestionType = (typeof CHAT_QUESTION_TYPES)[number]

export type ChatSearchIntent = 'general'

export interface ChatSearchQuery {
  question: string
  intent: ChatSearchIntent
  additionalKeywords: string[]
  preferredSourceCategories: ChatSourceCategory[]
}

export interface ChatQuestionAnalysis {
  normalizedQuestion: string
  questionType: ChatQuestionType
  searchQueries: ChatSearchQuery[]
}

function escapeRegularExpression(pattern: string): string {
  return pattern.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
}

function normalizeForMatch(text: string): string {
  return text.toLowerCase()
}

function includesTokenBoundedPattern(text: string, pattern: string): boolean {
  const normalizedText = normalizeForMatch(text)
  const normalizedPattern = normalizeForMatch(pattern).trim()
  const boundedPattern = new RegExp(
    String.raw`(^|\s)${escapeRegularExpression(normalizedPattern)}($|\s)`,
    'u',
  )

  return boundedPattern.test(normalizedText)
}

export function normalizeQuestion(question: string): string {
  return normalizeQuestionText(question)
}

function isGreetingQuestion(normalizedQuestion: string): boolean {
  return CHAT_QUESTION_RULES.GREETING_PATTERNS.some((pattern) => {
    return includesTokenBoundedPattern(normalizedQuestion, pattern)
  })
}

function splitQuestionIntoClauses(normalizedQuestion: string): string[] {
  for (const splitPattern of CHAT_QUESTION_RULES.SPLIT_PATTERNS) {
    if (!normalizedQuestion.includes(splitPattern)) {
      continue
    }

    const splitClauses = normalizedQuestion
      .split(splitPattern)
      .map((clause) => clause.trim())
      .filter((clause) => clause.length >= 4)
      .slice(0, 2)

    if (splitClauses.length >= 2) {
      return splitClauses
    }
  }

  return [normalizedQuestion]
}

export function analyzeQuestion(
  question: string,
  locale: SupportedLocale = LOCALES.DEFAULT,
): ChatQuestionAnalysis {
  const normalizedQuestion = normalizeQuestion(question)

  if (isGreetingQuestion(normalizedQuestion)) {
    return {
      normalizedQuestion,
      questionType: 'greeting',
      searchQueries: [],
    }
  }

  const splitClauses = splitQuestionIntoClauses(normalizedQuestion)

  if (splitClauses.length >= 2) {
    return {
      normalizedQuestion,
      questionType: 'general',
      searchQueries: splitClauses.map((clause) => {
        const normalizedClause = normalizeChatQuery({
          question: clause,
          locale,
        })

        return {
          question: normalizedClause.normalizedSearchQuestion,
          intent: 'general',
          additionalKeywords: normalizedClause.additionalKeywords,
          preferredSourceCategories:
            normalizedClause.preferredSourceCategories,
        }
      }),
    }
  }

  const normalizedSearchQuery = normalizeChatQuery({
    question: normalizedQuestion,
    locale,
  })

  return {
    normalizedQuestion,
    questionType: 'general',
    searchQueries: [
      {
        question: normalizedSearchQuery.normalizedSearchQuestion,
        intent: 'general',
        additionalKeywords: normalizedSearchQuery.additionalKeywords,
        preferredSourceCategories:
          normalizedSearchQuery.preferredSourceCategories,
      },
    ],
  }
}
