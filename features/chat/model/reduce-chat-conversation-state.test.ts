import { describe, expect, it } from 'vitest'
import {
  type ChatConversationState,
  EMPTY_CHAT_CONVERSATION_STATE,
} from '@/features/chat/model/chat-conversation-state'
import type { NormalizedChatIntent } from '@/features/chat/model/chat-intent'
import { reduceChatConversationState } from '@/features/chat/model/reduce-chat-conversation-state'

const EMPTY_TARGET = {
  kind: 'none',
  sourceCategory: null,
  slug: null,
  title: null,
} as const

const OWNER_TARGET = {
  kind: 'profile',
  sourceCategory: 'profile',
  slug: 'about',
  title: '이윤수',
} as const

const LEEMAGE_TARGET = {
  kind: 'named_entity',
  sourceCategory: 'project',
  slug: 'leemage',
  title: 'Leemage',
} as const

function buildIntent(
  overrides: Partial<NormalizedChatIntent> = {},
): NormalizedChatIntent {
  return {
    standaloneQuestion: '질문',
    operation: 'answer',
    target: EMPTY_TARGET,
    temporalConstraint: { order: 'none' },
    requestedFields: ['content'],
    evidenceScope: 'corpus',
    requiredConcepts: [],
    optionalConcepts: [],
    missingSlots: [],
    clarificationQuestion: null,
    confidence: 'high',
    reason: 'Complete question.',
    ...overrides,
  }
}

function buildPendingState(): ChatConversationState {
  const suspendedIntent = buildIntent({
    standaloneQuestion: '블로그 주인이 Vercel을 사용한 경험이 있나요?',
    evidenceScope: 'none',
    requiredConcepts: ['Vercel'],
    missingSlots: ['target'],
    clarificationQuestion: '누구를 가리키는지 알려주세요.',
  })

  return {
    ...EMPTY_CHAT_CONVERSATION_STATE,
    pendingClarification: {
      missingSlots: ['target'],
      clarificationQuestion: '누구를 가리키는지 알려주세요.',
      suspendedIntent,
    },
  }
}

describe('reduceChatConversationState', () => {
  it('resolve_clarification만 중단된 Vercel intent를 재개한다', () => {
    const result = reduceChatConversationState({
      previousState: buildPendingState(),
      contextAction: 'resolve_clarification',
      intent: buildIntent({ target: OWNER_TARGET, evidenceScope: 'entity' }),
    })

    expect(result.intent).toMatchObject({
      standaloneQuestion: '블로그 주인이 Vercel을 사용한 경험이 있나요?',
      target: OWNER_TARGET,
      requiredConcepts: ['Vercel'],
      missingSlots: [],
    })
    expect(result.nextState.pendingClarification).toBeNull()
  })

  it('reset은 pending intent를 읽지 않고 새 Leemage 질문으로 교체한다', () => {
    const leemageIntent = buildIntent({
      standaloneQuestion: 'Leemage에서 Presigned URL을 사용한 이유는?',
      operation: 'explain',
      target: LEEMAGE_TARGET,
      evidenceScope: 'entity',
      requiredConcepts: ['Presigned URL'],
    })
    const result = reduceChatConversationState({
      previousState: buildPendingState(),
      contextAction: 'reset',
      intent: leemageIntent,
    })

    expect(result.intent).toEqual(leemageIntent)
    expect(result.nextState.focusedTarget).toEqual(LEEMAGE_TARGET)
    expect(result.nextState.pendingClarification).toBeNull()
  })

  it('누락 slot이 있는 intent를 pending clarification으로 저장한다', () => {
    const intent = buildIntent({
      evidenceScope: 'none',
      missingSlots: ['target'],
      clarificationQuestion: '누구를 가리키는지 알려주세요.',
    })
    const result = reduceChatConversationState({
      previousState: EMPTY_CHAT_CONVERSATION_STATE,
      contextAction: 'reset',
      intent,
    })

    expect(result.nextState.pendingClarification).toMatchObject({
      missingSlots: ['target'],
      suspendedIntent: intent,
    })
    expect(result.nextState.lastIntent).toBeNull()
  })
})
