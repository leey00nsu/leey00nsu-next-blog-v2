import {
  CHAT_CONVERSATION_STATE_VERSION,
  type ChatConversationState,
} from '@/features/chat/model/chat-conversation-state'
import {
  type ChatContextAction,
  type ChatTarget,
  NormalizedChatIntentSchema,
  type NormalizedChatIntent,
} from '@/features/chat/model/chat-intent'

const CHAT_STATE_REDUCTION = {
  FALLBACK_CLARIFICATION_QUESTION:
    '답변에 필요한 대상을 조금 더 구체적으로 알려주세요.',
} as const

export interface ReduceChatConversationStateResult {
  intent: NormalizedChatIntent
  nextState: ChatConversationState
}

function resolveFocusedTarget(intent: NormalizedChatIntent): ChatTarget | null {
  return intent.target.kind === 'none' ? null : intent.target
}

function resumePendingIntent(params: {
  previousState: ChatConversationState
  intent: NormalizedChatIntent
}): NormalizedChatIntent {
  const suspendedIntent = params.previousState.pendingClarification?.suspendedIntent

  if (!suspendedIntent) {
    return params.intent
  }

  return NormalizedChatIntentSchema.parse({
    ...suspendedIntent,
    target: params.intent.target,
    evidenceScope: params.intent.evidenceScope,
    missingSlots: [],
    clarificationQuestion: null,
    confidence: params.intent.confidence,
    reason: params.intent.reason,
  })
}

function buildNextState(intent: NormalizedChatIntent): ChatConversationState {
  const hasMissingSlots = intent.missingSlots.length > 0
  const clarificationQuestion =
    intent.clarificationQuestion ??
    CHAT_STATE_REDUCTION.FALLBACK_CLARIFICATION_QUESTION

  return {
    version: CHAT_CONVERSATION_STATE_VERSION,
    focusedTarget: resolveFocusedTarget(intent),
    lastIntent: hasMissingSlots ? null : intent,
    pendingClarification: hasMissingSlots
      ? {
          missingSlots: intent.missingSlots,
          clarificationQuestion,
          suspendedIntent: {
            ...intent,
            clarificationQuestion,
          },
        }
      : null,
  }
}

export function reduceChatConversationState(params: {
  previousState: ChatConversationState
  contextAction: ChatContextAction
  intent: NormalizedChatIntent
}): ReduceChatConversationStateResult {
  const intent =
    params.contextAction === 'resolve_clarification'
      ? resumePendingIntent(params)
      : params.intent

  return {
    intent,
    nextState: buildNextState(intent),
  }
}
