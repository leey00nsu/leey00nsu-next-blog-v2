import { describe, expect, it } from 'vitest'
import {
  type ChatConversationState,
  EMPTY_CHAT_CONVERSATION_STATE,
} from '@/features/chat/model/chat-conversation-state'
import type {
  ChatIntentPatch,
  NormalizedChatIntent,
} from '@/features/chat/model/chat-intent'
import {
  buildIntentFromConversationState,
  reduceChatConversationState,
} from '@/features/chat/model/reduce-chat-conversation-state'

const OWNER_TARGET = {
  kind: 'profile',
  sourceCategory: 'profile',
  slug: 'about',
  title: '이윤수',
} as const

const BASE_PATCH: ChatIntentPatch = {
  standaloneQuestion: '블로그에 관해 알려주세요.',
  targetUpdate: { kind: 'preserve' },
  operation: 'answer',
  temporalConstraint: { order: 'none' },
  requestedFields: ['content'],
  evidenceScope: 'corpus',
  requiredConcepts: [],
  optionalConcepts: [],
  missingSlots: [],
  clarificationQuestion: null,
  confidence: 'high',
  reason: 'The question is complete.',
}

function buildResolvedState(): ChatConversationState {
  return {
    ...EMPTY_CHAT_CONVERSATION_STATE,
    resolvedTarget: OWNER_TARGET,
    activeOperation: 'answer',
    requestedFields: ['content'],
    requiredConcepts: ['React'],
    optionalConcepts: ['Next.js'],
    evidenceScope: 'entity',
    lastResolvedQuestion: '이윤수가 React를 사용하나요?',
  }
}

function buildSuspendedIntent(): NormalizedChatIntent {
  return {
    standaloneQuestion: '블로그 작성자가 Vercel을 사용한 경험이 있나요?',
    operation: 'answer',
    target: {
      kind: 'none',
      sourceCategory: null,
      slug: null,
      title: null,
    },
    temporalConstraint: { order: 'none' },
    requestedFields: ['content'],
    evidenceScope: 'entity',
    requiredConcepts: ['Vercel'],
    optionalConcepts: [],
    missingSlots: ['target'],
    clarificationQuestion: '누구를 가리키는지 알려주세요.',
    confidence: 'low',
    reason: 'The target is missing.',
  }
}

describe('reduceChatConversationState', () => {
  it('확정된 대상을 유지하면서 operation과 개념을 새 질문 값으로 교체한다', () => {
    const result = reduceChatConversationState({
      previousState: buildResolvedState(),
      intentPatch: {
        ...BASE_PATCH,
        standaloneQuestion: '이 사람이 Vercel을 사용했나요?',
        evidenceScope: 'entity',
        requiredConcepts: ['Vercel'],
      },
    })

    expect(result.intent.target).toEqual(OWNER_TARGET)
    expect(result.intent.requiredConcepts).toEqual(['Vercel'])
    expect(result.nextState.optionalConcepts).toEqual([])
  })

  it('clear update가 이전 대상을 제거한다', () => {
    const result = reduceChatConversationState({
      previousState: buildResolvedState(),
      intentPatch: {
        ...BASE_PATCH,
        targetUpdate: { kind: 'clear' },
      },
    })

    expect(result.intent.target.kind).toBe('none')
    expect(result.nextState.resolvedTarget).toBeNull()
  })

  it('필수 slot이 없으면 원래 Intent를 명확화 상태로 중단한다', () => {
    const suspendedIntent = buildSuspendedIntent()
    const result = reduceChatConversationState({
      previousState: EMPTY_CHAT_CONVERSATION_STATE,
      intentPatch: {
        ...BASE_PATCH,
        standaloneQuestion: suspendedIntent.standaloneQuestion,
        evidenceScope: suspendedIntent.evidenceScope,
        requiredConcepts: suspendedIntent.requiredConcepts,
        missingSlots: suspendedIntent.missingSlots,
        clarificationQuestion: suspendedIntent.clarificationQuestion,
        confidence: suspendedIntent.confidence,
        reason: suspendedIntent.reason,
      },
    })

    expect(result.nextState.pendingClarification).toMatchObject({
      missingSlots: ['target'],
      suspendedIntent: {
        requiredConcepts: ['Vercel'],
      },
    })
  })

  it('작성자 대상이 들어오면 중단했던 Vercel 질문을 즉시 재개한다', () => {
    const suspendedIntent = buildSuspendedIntent()
    const previousState: ChatConversationState = {
      ...EMPTY_CHAT_CONVERSATION_STATE,
      pendingClarification: {
        missingSlots: ['target'],
        clarificationQuestion: '누구를 가리키는지 알려주세요.',
        suspendedIntent,
      },
    }
    const result = reduceChatConversationState({
      previousState,
      intentPatch: {
        ...BASE_PATCH,
        standaloneQuestion: '블로그 주인을 말합니다.',
        targetUpdate: {
          kind: 'replace',
          target: OWNER_TARGET,
        },
        evidenceScope: 'entity',
      },
    })

    expect(result.intent).toMatchObject({
      standaloneQuestion: suspendedIntent.standaloneQuestion,
      target: OWNER_TARGET,
      requiredConcepts: ['Vercel'],
      missingSlots: [],
      clarificationQuestion: null,
    })
    expect(result.nextState.pendingClarification).toBeNull()
  })

  it('독립 질문에는 이전 질문의 검색 개념을 가져오지 않는다', () => {
    const result = reduceChatConversationState({
      previousState: buildResolvedState(),
      intentPatch: {
        ...BASE_PATCH,
        targetUpdate: { kind: 'clear' },
        standaloneQuestion: '최신 글은 언제 게시되었나요?',
        temporalConstraint: { order: 'latest' },
        requestedFields: ['title', 'published_at'],
        evidenceScope: 'corpus',
      },
    })

    expect(result.intent.requiredConcepts).toEqual([])
    expect(result.intent.optionalConcepts).toEqual([])
  })
})

describe('buildIntentFromConversationState', () => {
  it('planner를 사용할 수 없어도 완전한 상태에서 실행 Intent를 만든다', () => {
    const intent = buildIntentFromConversationState({
      question: '그래',
      state: buildResolvedState(),
    })

    expect(intent).toMatchObject({
      target: OWNER_TARGET,
      requiredConcepts: ['React'],
      evidenceScope: 'entity',
    })
  })

  it('명확화가 남은 상태는 실행 Intent로 만들지 않는다', () => {
    const suspendedIntent = buildSuspendedIntent()
    const intent = buildIntentFromConversationState({
      question: '그래',
      state: {
        ...EMPTY_CHAT_CONVERSATION_STATE,
        pendingClarification: {
          missingSlots: ['target'],
          clarificationQuestion: '누구를 가리키는지 알려주세요.',
          suspendedIntent,
        },
      },
    })

    expect(intent).toBeNull()
  })
})
