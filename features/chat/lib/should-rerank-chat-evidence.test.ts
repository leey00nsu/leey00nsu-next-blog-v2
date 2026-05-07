import { describe, expect, it } from 'vitest'
import { shouldRerankChatEvidence } from '@/features/chat/lib/should-rerank-chat-evidence'
import type { ChatQuestionPlan } from '@/features/chat/model/chat-question-plan'

const DEFAULT_QUESTION_PLAN: ChatQuestionPlan = {
  standaloneQuestion: '기술 스택과 설계 철학이 뭐야',
  action: 'answer' as const,
  route: 'retrieve' as const,
  directAction: 'none' as const,
  retrievalScope: 'entity' as const,
  referenceTarget: {
    kind: 'named_entity' as const,
    sourceCategory: null,
    slug: null,
    title: null,
    confidence: 'medium' as const,
  },
  preferredSourceCategories: ['blog'],
  additionalKeywords: [],
  clarificationQuestion: null,
  reason: 'default retrieval',
}

describe('shouldRerankChatEvidence', () => {
  it('복합 retrieval 질문은 rerank 대상으로 분류한다', () => {
    expect(
      shouldRerankChatEvidence({
        question: '기술 스택과 설계 철학이 뭐야',
        conversationHistoryCount: 0,
        matchCount: 3,
        questionPlan: DEFAULT_QUESTION_PLAN,
      }),
    ).toBe(true)
  })

  it('간단한 social reply는 rerank하지 않는다', () => {
    expect(
      shouldRerankChatEvidence({
        question: '안녕',
        conversationHistoryCount: 0,
        matchCount: 3,
        questionPlan: {
          ...DEFAULT_QUESTION_PLAN,
          route: 'direct',
          directAction: 'social_reply',
          retrievalScope: 'none',
        },
      }),
    ).toBe(false)
  })
})
