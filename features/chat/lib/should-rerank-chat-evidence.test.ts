import { describe, expect, it } from 'vitest'
import { shouldRerankChatEvidence } from '@/features/chat/lib/should-rerank-chat-evidence'
import type { ChatRetrievalPlan } from '@/features/chat/model/chat-retrieval-plan'

const BASE_PLAN: ChatRetrievalPlan = {
  executionKind: 'retrieve_and_generate',
  standaloneQuestion: '기술 스택과 설계 철학이 뭐야',
  operation: 'explain',
  canonicalTargets: [],
  sourceStrategy: 'all',
  sourceCategories: [],
  requiredConcepts: [],
  optionalConcepts: [],
  requestedFields: ['content'],
  temporalStrategy: 'none',
  temporalOrder: null,
  maximumEvidenceCount: 3,
}

describe('shouldRerankChatEvidence', () => {
  it('모든 후보가 최종 근거에 들어가면 rerank하지 않는다', () => {
    expect(shouldRerankChatEvidence({
      matchCount: BASE_PLAN.maximumEvidenceCount,
      plan: BASE_PLAN,
    })).toBe(false)
  })

  it('후보가 최종 근거 수를 초과하면 rerank한다', () => {
    expect(shouldRerankChatEvidence({
      matchCount: BASE_PLAN.maximumEvidenceCount + 1,
      plan: BASE_PLAN,
    })).toBe(true)
  })

  it('근거가 하나뿐이면 rerank하지 않는다', () => {
    expect(shouldRerankChatEvidence({
      matchCount: 1,
      plan: BASE_PLAN,
    })).toBe(false)
  })

  it('검색 경로에서는 operation 이름으로 rerank를 막지 않는다', () => {
    expect(shouldRerankChatEvidence({
      matchCount: BASE_PLAN.maximumEvidenceCount + 1,
      plan: { ...BASE_PLAN, operation: 'contact' },
    })).toBe(true)
  })
})
