import { CHAT_QUESTION_RULES } from '@/features/chat/config/question-rules'
import {
  normalizeChatQuery,
  normalizeQuestionText,
} from '@/features/chat/lib/chat-query-normalization'
import type { ChatSourceCategory } from '@/features/chat/model/chat-evidence'
import {
  LOCALES,
  type SupportedLocale,
} from '@/shared/config/constants'

export const CHAT_QUESTION_TYPES = ['general'] as const

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

export function normalizeQuestion(question: string): string {
  return normalizeQuestionText(question)
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
