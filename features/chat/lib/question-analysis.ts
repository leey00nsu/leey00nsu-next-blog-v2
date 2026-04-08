import { CHAT_QUESTION_RULES } from '@/features/chat/config/question-rules'
import type { ChatSourceCategory } from '@/features/chat/model/chat-evidence'

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

const QUESTION_NORMALIZATION_PATTERNS = {
  PUNCTUATION: /[?!,]+/g,
  WHITESPACE: /\s+/g,
} as const

function escapeRegularExpression(pattern: string): string {
  return pattern.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeForMatch(text: string): string {
  return text.toLowerCase()
}

function includesTokenBoundedPattern(text: string, pattern: string): boolean {
  const normalizedText = normalizeForMatch(text)
  const normalizedPattern = normalizeForMatch(pattern).trim()
  const boundedPattern = new RegExp(
    `(^|\\s)${escapeRegularExpression(normalizedPattern)}($|\\s)`,
    'u',
  )

  return boundedPattern.test(normalizedText)
}

export function normalizeQuestion(question: string): string {
  return question
    .trim()
    .replaceAll(QUESTION_NORMALIZATION_PATTERNS.PUNCTUATION, ' ')
    .replaceAll(QUESTION_NORMALIZATION_PATTERNS.WHITESPACE, ' ')
    .trim()
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

export function analyzeQuestion(question: string): ChatQuestionAnalysis {
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
        return {
          question: clause,
          intent: 'general',
          additionalKeywords: [],
          preferredSourceCategories: [],
        }
      }),
    }
  }

  return {
    normalizedQuestion,
    questionType: 'general',
    searchQueries: [
      {
        question: normalizedQuestion,
        intent: 'general',
        additionalKeywords: [],
        preferredSourceCategories: [],
      },
    ],
  }
}
