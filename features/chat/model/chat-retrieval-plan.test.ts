import { describe, expect, it } from 'vitest'
import { ChatRetrievalPlanSchema } from '@/features/chat/model/chat-retrieval-plan'

const BASE_RETRIEVAL_PLAN = {
  executionKind: 'retrieve_and_generate',
  standaloneQuestion: 'AI 활용을 설명해줘',
  operation: 'explain',
  canonicalTargets: [],
  sourceStrategy: 'all',
  sourceCategories: [],
  requiredConcepts: ['AI'],
  optionalConcepts: [],
  requestedFields: ['content'],
  temporalStrategy: 'none',
  temporalOrder: null,
  maximumEvidenceCount: 5,
} as const

describe('ChatRetrievalPlanSchema', () => {
  it('none temporal strategy에 null order를 허용한다', () => {
    expect(ChatRetrievalPlanSchema.safeParse(BASE_RETRIEVAL_PLAN).success).toBe(
      true,
    )
  })

  it('rank temporal strategy에 시간 순서를 허용한다', () => {
    expect(
      ChatRetrievalPlanSchema.safeParse({
        ...BASE_RETRIEVAL_PLAN,
        temporalStrategy: 'rank',
        temporalOrder: 'latest',
      }).success,
    ).toBe(true)
  })

  it('none temporal strategy의 non-null order를 거부한다', () => {
    expect(
      ChatRetrievalPlanSchema.safeParse({
        ...BASE_RETRIEVAL_PLAN,
        temporalOrder: 'latest',
      }).success,
    ).toBe(false)
  })

  it('only source strategy의 빈 categories를 거부한다', () => {
    expect(
      ChatRetrievalPlanSchema.safeParse({
        ...BASE_RETRIEVAL_PLAN,
        sourceStrategy: 'only',
      }).success,
    ).toBe(false)
  })
})
