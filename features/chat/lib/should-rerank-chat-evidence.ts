import { BLOG_CHAT } from '@/features/chat/config/constants'
import type { ChatRetrievalPlan } from '@/features/chat/model/chat-retrieval-plan'

const CHAT_RERANK_PATTERNS = {
  COMPOUND_CONJUNCTIONS: ['그리고', '또는', ' and ', ' or '],
  COMPOUND_SUFFIXES: ['과 ', '와 '],
} as const

const CHAT_RERANK_EXCLUDED_OPERATIONS = new Set<ChatRetrievalPlan['operation']>(
  ['social_reply', 'identity', 'owner_identity', 'contact'],
)

interface ShouldRerankChatEvidenceParams {
  question: string
  matchCount: number
  plan: ChatRetrievalPlan
  hasConversationContext: boolean
}

function hasCompoundQuestion(question: string): boolean {
  const normalizedQuestion = question.trim().toLowerCase()

  return (
    CHAT_RERANK_PATTERNS.COMPOUND_CONJUNCTIONS.some((pattern) => {
      return normalizedQuestion.includes(pattern)
    }) ||
    CHAT_RERANK_PATTERNS.COMPOUND_SUFFIXES.some((pattern) => {
      return normalizedQuestion.includes(pattern)
    })
  )
}

/**
 * LLM rerank 호출 여부를 정한다.
 *
 * rerank는 외부 모델 호출이므로 근거가 하나뿐이면 재정렬할 여지가 없어 건너뛰고,
 * 후보가 최종 근거 수보다 많으면 질문 길이와 무관하게 선별한다.
 * 그 밖에는 긴 질문, 이어지는 대화, 복합 질문에서 호출한다.
 */
export function shouldRerankChatEvidence(
  params: ShouldRerankChatEvidenceParams,
): boolean {
  if (CHAT_RERANK_EXCLUDED_OPERATIONS.has(params.plan.operation)) {
    return false
  }

  if (params.matchCount < BLOG_CHAT.RERANK.MINIMUM_MATCH_COUNT) {
    return false
  }

  return (
    params.matchCount > params.plan.maximumEvidenceCount ||
    params.question.length >= BLOG_CHAT.RERANK.LONG_QUESTION_MINIMUM_LENGTH ||
    params.hasConversationContext ||
    hasCompoundQuestion(params.question)
  )
}
