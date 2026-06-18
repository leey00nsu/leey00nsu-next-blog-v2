import { describe, expect, it } from 'vitest'
import {
  ChatIntentPatchSchema,
  ChatTargetUpdateSchema,
  NormalizedChatIntentSchema,
} from '@/features/chat/model/chat-intent'

const NORMALIZED_INTENT = {
  standaloneQuestion: '이윤수가 Vercel을 사용한 경험이 있나요?',
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
  requiredConcepts: ['Vercel'],
  optionalConcepts: [],
  missingSlots: [],
  clarificationQuestion: null,
  confidence: 'high',
  reason: 'The target and required concept are explicit.',
} as const

describe('NormalizedChatIntentSchema', () => {
  it('실행에 필요한 의미를 손실 없이 파싱한다', () => {
    const intent = NormalizedChatIntentSchema.parse(NORMALIZED_INTENT)

    expect(intent.requiredConcepts).toEqual(['Vercel'])
    expect(intent.requestedFields).toEqual(['content'])
  })

  it('지원하지 않는 operation을 거부한다', () => {
    expect(() => {
      NormalizedChatIntentSchema.parse({
        ...NORMALIZED_INTENT,
        operation: 'count',
      })
    }).toThrow()
  })
})

describe('ChatIntentPatchSchema', () => {
  it('대상 유지와 대상 초기화를 구분한다', () => {
    expect(ChatTargetUpdateSchema.parse({ kind: 'preserve' })).toEqual({
      kind: 'preserve',
    })
    expect(ChatTargetUpdateSchema.parse({ kind: 'clear' })).toEqual({
      kind: 'clear',
    })
  })

  it('대상 변경을 포함한 patch를 파싱한다', () => {
    const patch = ChatIntentPatchSchema.parse({
      ...NORMALIZED_INTENT,
      target: undefined,
      targetUpdate: {
        kind: 'replace',
        target: NORMALIZED_INTENT.target,
      },
    })

    expect(patch.targetUpdate.kind).toBe('replace')
  })
})
