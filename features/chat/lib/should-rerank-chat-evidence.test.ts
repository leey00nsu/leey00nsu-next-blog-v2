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

const LONG_QUESTION =
  '프로젝트를 진행하면서 어떤 문제를 어떻게 해결했는지 순서대로 설명해줘'

describe('shouldRerankChatEvidence', () => {
  it('여러 근거가 있는 긴 질문은 rerank 대상으로 분류한다', () => {
    expect(
      shouldRerankChatEvidence({
        question: LONG_QUESTION,
        matchCount: 3,
        plan: BASE_PLAN,
        hasConversationContext: false,
      }),
    ).toBe(true)
  })

  it('짧고 단순한 질문은 휴리스틱 순서를 그대로 쓴다', () => {
    expect(
      shouldRerankChatEvidence({
        question: 'React 쓴 프로젝트 있어?',
        matchCount: 3,
        plan: BASE_PLAN,
        hasConversationContext: false,
      }),
    ).toBe(false)
  })

  it('짧은 질문도 최종 근거보다 후보가 많으면 선별한다', () => {
    expect(
      shouldRerankChatEvidence({
        question: '저장 방법?',
        matchCount: BASE_PLAN.maximumEvidenceCount + 1,
        plan: BASE_PLAN,
        hasConversationContext: false,
      }),
    ).toBe(true)
  })

  it('같은 문서 안에서 비교하는 복합 질문은 rerank 대상으로 분류한다', () => {
    expect(
      shouldRerankChatEvidence({
        question: '기술 스택과 배포 방식',
        matchCount: 2,
        plan: BASE_PLAN,
        hasConversationContext: false,
      }),
    ).toBe(true)
  })

  it('이어지는 대화의 후속 질문은 rerank 대상으로 분류한다', () => {
    expect(
      shouldRerankChatEvidence({
        question: '그건 왜 그렇게 했어?',
        matchCount: 2,
        plan: BASE_PLAN,
        hasConversationContext: true,
      }),
    ).toBe(true)
  })

  it('근거가 하나뿐이면 rerank하지 않는다', () => {
    expect(
      shouldRerankChatEvidence({
        question: LONG_QUESTION,
        matchCount: 1,
        plan: BASE_PLAN,
        hasConversationContext: true,
      }),
    ).toBe(false)
  })

  it('근거 검색을 하지 않는 operation은 rerank하지 않는다', () => {
    expect(
      shouldRerankChatEvidence({
        question: LONG_QUESTION,
        matchCount: 3,
        plan: { ...BASE_PLAN, operation: 'contact' },
        hasConversationContext: true,
      }),
    ).toBe(false)
  })
})
