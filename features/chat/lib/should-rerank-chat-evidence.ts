import type { ChatRetrievalPlan } from '@/features/chat/model/chat-retrieval-plan'

interface ShouldRerankChatEvidenceParams {
  matchCount: number
  plan: ChatRetrievalPlan
}

/**
 * 최종 근거 수 때문에 후보가 잘릴 때만 추가 모델을 호출한다.
 * 후보가 모두 답변 모델에 전달된다면 별도 재정렬은 생략한다.
 */
export function shouldRerankChatEvidence(
  params: ShouldRerankChatEvidenceParams,
): boolean {
  return params.matchCount > params.plan.maximumEvidenceCount
}
