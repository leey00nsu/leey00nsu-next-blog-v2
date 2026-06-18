import { describe, expect, it } from 'vitest'
import {
  shouldRerankChatEvidence,
  shouldRerankChatIntentEvidence,
} from '@/features/chat/lib/should-rerank-chat-evidence'
import type { NormalizedChatIntent } from '@/features/chat/model/chat-intent'
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

const DEFAULT_INTENT: NormalizedChatIntent = {
  standaloneQuestion: '기술 스택과 설계 철학이 뭐야',
  operation: 'answer',
  target: {
    kind: 'profile',
    sourceCategory: 'profile',
    slug: 'about',
    title: '이윤수',
  },
  temporalConstraint: { order: 'none' },
  requestedFields: ['content'],
  evidenceScope: 'entity',
  requiredConcepts: ['기술 스택'],
  optionalConcepts: ['설계 철학'],
  missingSlots: [],
  clarificationQuestion: null,
  confidence: 'high',
  reason: 'Compound profile question.',
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

describe('shouldRerankChatIntentEvidence', () => {
  it('복합 intent retrieval은 rerank 대상으로 분류한다', () => {
    expect(
      shouldRerankChatIntentEvidence({
        question: DEFAULT_INTENT.standaloneQuestion,
        conversationHistoryCount: 0,
        matchCount: 3,
        intent: DEFAULT_INTENT,
      }),
    ).toBe(true)
  })

  it('social reply intent는 rerank하지 않는다', () => {
    expect(
      shouldRerankChatIntentEvidence({
        question: '안녕',
        conversationHistoryCount: 0,
        matchCount: 3,
        intent: {
          ...DEFAULT_INTENT,
          operation: 'social_reply',
          evidenceScope: 'none',
          requiredConcepts: [],
          optionalConcepts: [],
        },
      }),
    ).toBe(false)
  })
})
