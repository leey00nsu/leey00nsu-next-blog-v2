import { describe, expect, it } from 'vitest'
import {
  ChatIntentPlanSchema,
  ChatTargetSelectionSchema,
  NormalizedChatIntentSchema,
} from '@/features/chat/model/chat-intent'

export const NORMALIZED_INTENT_FIXTURE = {
  standaloneQuestion: 'Leemage에서 Presigned URL을 사용한 이유는?',
  operation: 'explain',
  target: {
    kind: 'named_entity',
    sourceCategory: 'project',
    slug: 'leemage',
    title: 'Leemage',
  },
  temporalConstraint: { order: 'none' },
  requestedFields: ['content'],
  evidenceScope: 'entity',
  requiredConcepts: ['Presigned URL'],
  optionalConcepts: [],
  missingSlots: [],
  clarificationQuestion: null,
  confidence: 'high',
  reason: 'The project and concept are explicit.',
} as const

describe('NormalizedChatIntentSchema', () => {
  it('실행 의미를 손실 없이 파싱한다', () => {
    const intent = NormalizedChatIntentSchema.parse(NORMALIZED_INTENT_FIXTURE)

    expect(intent.target.slug).toBe('leemage')
    expect(intent.requiredConcepts).toEqual(['Presigned URL'])
  })
})

describe('ChatIntentPlanSchema', () => {
  it('독립 주제와 새 candidate 선택을 함께 표현한다', () => {
    const plan = ChatIntentPlanSchema.parse({
      ...NORMALIZED_INTENT_FIXTURE,
      target: undefined,
      contextAction: 'reset',
      targetSelection: {
        kind: 'candidate',
        entityId: 'project/leemage',
      },
    })

    expect(plan.contextAction).toBe('reset')
    expect(plan.targetSelection).toEqual({
      kind: 'candidate',
      entityId: 'project/leemage',
    })
  })

  it('candidate, preserve, none 선택을 구분한다', () => {
    expect(
      ChatTargetSelectionSchema.parse({
        kind: 'candidate',
        entityId: 'project/leemage',
      }),
    ).toEqual({ kind: 'candidate', entityId: 'project/leemage' })
    expect(ChatTargetSelectionSchema.parse({ kind: 'preserve' })).toEqual({
      kind: 'preserve',
    })
    expect(ChatTargetSelectionSchema.parse({ kind: 'none' })).toEqual({
      kind: 'none',
    })
  })
})
