import { describe, expect, it } from 'vitest'
import type { ChatTarget } from '@/features/chat/model/chat-plan-primitives'
import type { ChatQueryPlan } from '@/features/chat/model/chat-query-plan'
import { reduceChatConversationState } from '@/features/chat/model/reduce-chat-conversation-state'

const EMPTY_TARGET: ChatTarget = {
  kind: 'none',
  sourceCategory: null,
  slug: null,
  title: null,
}

const LEEMAGE_TARGET: ChatTarget = {
  kind: 'named_entity',
  sourceCategory: 'project',
  slug: 'leemage',
  title: 'Leemage',
}

function buildQueryPlan(
  overrides: Partial<ChatQueryPlan> = {},
): ChatQueryPlan {
  return {
    standaloneQuestion: '질문',
    contextAction: 'reset',
    targetSelection: { kind: 'none' },
    operation: 'lookup',
    sourceSelection: { mode: 'all' },
    temporalSelection: { mode: 'none' },
    requestedFields: ['content'],
    requiredConcepts: [],
    optionalConcepts: [],
    missingSlots: [],
    clarificationQuestion: null,
    confidence: 'high',
    reason: 'Complete question.',
    ...overrides,
  }
}

describe('reduceChatConversationState', () => {
  it('완료된 계획과 canonical target을 다음 상태에 저장한다', () => {
    const queryPlan = buildQueryPlan({
      standaloneQuestion: 'Leemage에서 Presigned URL을 사용한 이유는?',
      operation: 'explain',
      requiredConcepts: ['Presigned URL'],
    })
    const result = reduceChatConversationState({
      queryPlan,
      target: LEEMAGE_TARGET,
    })

    expect(result.focusedTarget).toEqual(LEEMAGE_TARGET)
    expect(result.lastQueryPlan).toEqual(queryPlan)
    expect(result.pendingClarification).toBeNull()
  })

  it('누락 slot이 있는 계획을 pending clarification으로 저장한다', () => {
    const queryPlan = buildQueryPlan({
      missingSlots: ['target'],
      clarificationQuestion: '누구를 가리키는지 알려주세요.',
    })
    const result = reduceChatConversationState({
      queryPlan,
      target: EMPTY_TARGET,
    })

    expect(result.pendingClarification).toMatchObject({
      clarificationQuestion: '누구를 가리키는지 알려주세요.',
      suspendedQueryPlan: queryPlan,
    })
    expect(result.lastQueryPlan).toBeNull()
  })
})
