import { BLOG_CHAT } from '@/features/chat/config/constants'
import type { NormalizedChatIntent } from '@/features/chat/model/chat-intent'

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

export function shouldRerankChatEvidence(params: {
  question: string
  conversationHistoryCount: number
  matchCount: number
  intent: NormalizedChatIntent
}): boolean {
  if (
    params.intent.evidenceScope === 'none' ||
    params.intent.operation === 'social_reply' ||
    params.intent.operation === 'contact'
  ) {
    return false
  }

  if (params.matchCount < BLOG_CHAT.RERANK.MINIMUM_MATCH_COUNT) {
    return false
  }

  return (
    params.question.length >= BLOG_CHAT.RERANK.LONG_QUESTION_MINIMUM_LENGTH ||
    params.conversationHistoryCount > 0 ||
    hasCompoundQuery(params.question)
  )
}
