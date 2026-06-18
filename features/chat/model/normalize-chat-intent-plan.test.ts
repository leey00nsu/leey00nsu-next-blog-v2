import { describe, expect, it } from 'vitest'
import type { ChatEntityCandidate } from '@/features/chat/model/chat-entity-candidate'
import { EMPTY_CHAT_CONVERSATION_STATE } from '@/features/chat/model/chat-conversation-state'
import type { ChatIntentPlan } from '@/features/chat/model/chat-intent'
import { normalizeChatIntentPlan } from '@/features/chat/model/normalize-chat-intent-plan'

const LEEMAGE_CANDIDATE: ChatEntityCandidate = {
  entityId: 'project/leemage',
  kind: 'project',
  slug: 'leemage',
  title: 'Leemage',
  aliases: ['Leemage'],
  searchTerms: ['Presigned URL'],
  sourceCategory: 'project',
}

const BASE_PLAN: ChatIntentPlan = {
  standaloneQuestion: 'Leemage에서 Presigned URL을 사용한 이유는?',
  contextAction: 'reset',
  targetSelection: { kind: 'candidate', entityId: 'project/leemage' },
  operation: 'explain',
  temporalConstraint: { order: 'none' },
  requestedFields: ['content'],
  evidenceScope: 'none',
  requiredConcepts: ['Presigned URL'],
  optionalConcepts: [],
  missingSlots: [],
  clarificationQuestion: null,
  confidence: 'high',
  reason: 'Explicit project question.',
}

describe('normalizeChatIntentPlan', () => {
  it('candidate를 canonical target으로 바꾸고 entity scope로 정규화한다', () => {
    const result = normalizeChatIntentPlan({
      intentPlan: BASE_PLAN,
      candidates: [LEEMAGE_CANDIDATE],
      previousState: EMPTY_CHAT_CONVERSATION_STATE,
    })

    expect(result).toEqual({
      ok: true,
      contextAction: 'reset',
      intent: expect.objectContaining({
        target: expect.objectContaining({
          slug: 'leemage',
          title: 'Leemage',
        }),
        evidenceScope: 'entity',
      }),
    })
  })

  it('catalog에 없는 candidate를 거부한다', () => {
    const result = normalizeChatIntentPlan({
      intentPlan: BASE_PLAN,
      candidates: [],
      previousState: EMPTY_CHAT_CONVERSATION_STATE,
    })

    expect(result).toEqual({ ok: false, failureKind: 'invalid_candidate' })
  })

  it('pending clarification 없는 resolve transition을 새 질문 reset으로 교정한다', () => {
    const result = normalizeChatIntentPlan({
      intentPlan: {
        ...BASE_PLAN,
        contextAction: 'resolve_clarification',
      },
      candidates: [LEEMAGE_CANDIDATE],
      previousState: EMPTY_CHAT_CONVERSATION_STATE,
    })

    expect(result).toMatchObject({
      ok: true,
      contextAction: 'reset',
    })
  })

  it('누락 slot 없이 clarification을 생성하는 plan을 거부한다', () => {
    const result = normalizeChatIntentPlan({
      intentPlan: {
        ...BASE_PLAN,
        targetSelection: { kind: 'none' },
        evidenceScope: 'none',
        clarificationQuestion: '어느 프로젝트인가요?',
      },
      candidates: [LEEMAGE_CANDIDATE],
      previousState: EMPTY_CHAT_CONVERSATION_STATE,
    })

    expect(result).toEqual({ ok: false, failureKind: 'invalid_intent_plan' })
  })

  it('corpus 질문의 불필요한 target clarification을 제거한다', () => {
    const result = normalizeChatIntentPlan({
      intentPlan: {
        ...BASE_PLAN,
        targetSelection: { kind: 'none' },
        evidenceScope: 'corpus',
        missingSlots: ['target'],
        clarificationQuestion: '어느 프로젝트인가요?',
      },
      candidates: [],
      previousState: EMPTY_CHAT_CONVERSATION_STATE,
    })

    expect(result).toMatchObject({
      ok: true,
      intent: {
        evidenceScope: 'corpus',
        missingSlots: [],
        clarificationQuestion: null,
      },
    })
  })
})
