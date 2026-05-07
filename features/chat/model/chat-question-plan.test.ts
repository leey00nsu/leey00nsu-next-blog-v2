import { describe, expect, it } from 'vitest'
import { ChatQuestionPlanSchema } from '@/features/chat/model/chat-question-plan'

describe('ChatQuestionPlanSchema', () => {
  it('reference target과 retrieval scope를 포함한 planner output을 파싱한다', () => {
    const result = ChatQuestionPlanSchema.parse({
      standaloneQuestion: '현재 글에서 구조가 왜 중요한가?',
      action: 'answer',
      route: 'retrieve',
      directAction: 'none',
      retrievalScope: 'current_source',
      referenceTarget: {
        kind: 'current_source',
        sourceCategory: 'blog',
        slug: 'why-i-built-lee-spec-kit',
        title: null,
        confidence: 'high',
      },
      preferredSourceCategories: ['blog'],
      additionalKeywords: ['구조'],
      clarificationQuestion: null,
      reason: 'current post question',
    })

    expect(result).toMatchObject({
      route: 'retrieve',
      retrievalScope: 'current_source',
      referenceTarget: {
        kind: 'current_source',
        sourceCategory: 'blog',
      },
    })
  })
})
