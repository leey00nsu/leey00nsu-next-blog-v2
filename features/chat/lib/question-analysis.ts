import { CHAT_QUESTION_RULES } from '@/features/chat/config/question-rules'
import type { ChatSourceCategory } from '@/features/chat/model/chat-evidence'

export const CHAT_QUESTION_TYPES = [
  'greeting',
  'profile',
  'education',
  'career',
  'projects',
  'tech-stack',
  'blog-purpose',
  'general',
] as const

export type ChatQuestionType = (typeof CHAT_QUESTION_TYPES)[number]

export type ChatSearchIntent = Exclude<ChatQuestionType, 'greeting'>
type RuleBasedChatIntent = keyof typeof CHAT_QUESTION_RULES.INTENTS

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

function normalizeForMatch(text: string): string {
  return text.toLowerCase()
}

export function normalizeQuestion(question: string): string {
  return question
    .trim()
    .replaceAll(QUESTION_NORMALIZATION_PATTERNS.PUNCTUATION, ' ')
    .replaceAll(QUESTION_NORMALIZATION_PATTERNS.WHITESPACE, ' ')
    .trim()
}

function detectMatchedIntents(normalizedQuestion: string): RuleBasedChatIntent[] {
  const normalizedQuestionForMatch = normalizeForMatch(normalizedQuestion)
  const matchedIntents = Object.entries(CHAT_QUESTION_RULES.INTENTS).flatMap(
    ([intent, rule]) => {
      const isMatched = rule.patterns.some((pattern) => {
        return normalizedQuestionForMatch.includes(normalizeForMatch(pattern))
      })

      return isMatched ? [intent as RuleBasedChatIntent] : []
    },
  )

  return [...new Set(matchedIntents)]
}

function isGreetingQuestion(normalizedQuestion: string): boolean {
  const normalizedQuestionForMatch = normalizeForMatch(normalizedQuestion)

  return CHAT_QUESTION_RULES.GREETING_PATTERNS.some((pattern) => {
    return normalizedQuestionForMatch.includes(normalizeForMatch(pattern))
  })
}

function buildIntentSearchQueries(
  matchedIntents: RuleBasedChatIntent[],
  normalizedQuestion: string,
): ChatSearchQuery[] {
  return matchedIntents.map((intent) => {
    const rule = CHAT_QUESTION_RULES.INTENTS[intent]

    return {
      question: normalizedQuestion,
      intent: intent as ChatSearchIntent,
      additionalKeywords: rule.expansionKeywords,
      preferredSourceCategories: rule.preferredSourceCategories,
    }
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

  const matchedIntents = detectMatchedIntents(normalizedQuestion)

  if (matchedIntents.length >= 2) {
    return {
      normalizedQuestion,
      questionType: 'general',
      searchQueries: buildIntentSearchQueries(matchedIntents, normalizedQuestion),
    }
  }

  if (matchedIntents.length === 1) {
    const [singleIntent] = matchedIntents

    return {
      normalizedQuestion,
      questionType: singleIntent,
      searchQueries: buildIntentSearchQueries(
        [singleIntent],
        normalizedQuestion,
      ),
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
