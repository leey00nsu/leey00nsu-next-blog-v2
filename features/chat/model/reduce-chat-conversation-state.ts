import {
  CHAT_CONVERSATION_STATE_VERSION,
  type ChatConversationState,
} from '@/features/chat/model/chat-conversation-state'
import type { ChatTarget } from '@/features/chat/model/chat-plan-primitives'
import type { ChatQueryPlan } from '@/features/chat/model/chat-query-plan'

const CHAT_STATE_REDUCTION = {
  FALLBACK_CLARIFICATION_QUESTION:
    '답변에 필요한 대상을 조금 더 구체적으로 알려주세요.',
} as const

export function reduceChatConversationState(params: {
  queryPlan: ChatQueryPlan
  target: ChatTarget
}): ChatConversationState {
  const hasMissingSlots = params.queryPlan.missingSlots.length > 0
  const clarificationQuestion =
    params.queryPlan.clarificationQuestion ??
    CHAT_STATE_REDUCTION.FALLBACK_CLARIFICATION_QUESTION

  return {
    version: CHAT_CONVERSATION_STATE_VERSION,
    focusedTarget: params.target.kind === 'none' ? null : params.target,
    lastQueryPlan: hasMissingSlots ? null : params.queryPlan,
    pendingClarification: hasMissingSlots
      ? {
          clarificationQuestion,
          suspendedQueryPlan: {
            ...params.queryPlan,
            clarificationQuestion,
          },
        }
      : null,
  }
}
