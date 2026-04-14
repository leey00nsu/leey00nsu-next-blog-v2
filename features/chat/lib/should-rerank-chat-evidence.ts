import { BLOG_CHAT } from '@/features/chat/config/constants'
import type { ChatQuestionPlan } from '@/features/chat/model/chat-question-plan'

interface ShouldRerankChatEvidenceParams {
  question: string
  conversationHistoryCount: number
  matchCount: number
  questionPlan: ChatQuestionPlan
}

const CHAT_RERANK_PATTERNS = {
  COMPOUND_QUERY: ['그리고', ' and ', '또는'],
  COMPOUND_SUFFIXES: ['과 ', '와 '],
} as const

function hasCompoundQuery(question: string): boolean {
  const normalizedQuestion = question.trim().toLowerCase()

  return (
    CHAT_RERANK_PATTERNS.COMPOUND_QUERY.some((pattern) => {
      return normalizedQuestion.includes(pattern)
    }) ||
    CHAT_RERANK_PATTERNS.COMPOUND_SUFFIXES.some((pattern) => {
      return normalizedQuestion.includes(pattern)
    })
  )
}

export function shouldRerankChatEvidence({
  question,
  conversationHistoryCount,
  matchCount,
  questionPlan,
}: ShouldRerankChatEvidenceParams): boolean {
  if (!questionPlan.needsRetrieval) {
    return false
  }

  if (questionPlan.retrievalMode === 'none') {
    return false
  }

  if (questionPlan.needsClarification) {
    return false
  }

  if (questionPlan.deterministicAction !== 'none') {
    return false
  }

  if (matchCount < BLOG_CHAT.RERANK.MINIMUM_MATCH_COUNT) {
    return false
  }

  return (
    question.length >= BLOG_CHAT.RERANK.LONG_QUESTION_MINIMUM_LENGTH ||
    conversationHistoryCount > 0 ||
    hasCompoundQuery(question)
  )
}
