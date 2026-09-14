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
 * 짧고 단순한 질문도 휴리스틱 순서로 충분하므로 건너뛴다. 여러 근거를 비교해야 하는
 * 긴 질문, 이어지는 대화, 복합 질문에서만 호출한다.
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
    params.question.length >= BLOG_CHAT.RERANK.LONG_QUESTION_MINIMUM_LENGTH ||
    params.hasConversationContext ||
    hasCompoundQuestion(params.question)
  )
}
