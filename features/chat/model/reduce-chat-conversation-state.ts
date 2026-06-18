import {
  CHAT_CONVERSATION_STATE_VERSION,
  type ChatConversationState,
} from '@/features/chat/model/chat-conversation-state'
import {
  type ChatIntentPatch,
  type ChatMissingSlot,
  type ChatTarget,
  NormalizedChatIntentSchema,
  type NormalizedChatIntent,
} from '@/features/chat/model/chat-intent'

const CHAT_STATE_REDUCTION = {
  FALLBACK_CLARIFICATION_QUESTION:
    '답변에 필요한 대상을 조금 더 구체적으로 알려주세요.',
  RESTORED_STATE_REASON: 'The intent was restored from validated conversation state.',
} as const

const EMPTY_CHAT_TARGET: ChatTarget = {
  kind: 'none',
  sourceCategory: null,
  slug: null,
  title: null,
}

interface ReduceChatConversationStateParams {
  previousState: ChatConversationState
  intentPatch: ChatIntentPatch
}

export interface ReduceChatConversationStateResult {
  intent: NormalizedChatIntent
  nextState: ChatConversationState
}

function buildUniqueValues<Value>(values: readonly Value[]): Value[] {
  return [...new Set(values)]
}

function resolveUpdatedTarget(params: {
  previousState: ChatConversationState
  intentPatch: ChatIntentPatch
}): ChatTarget {
  if (params.intentPatch.targetUpdate.kind === 'replace') {
    return params.intentPatch.targetUpdate.target
  }

  if (params.intentPatch.targetUpdate.kind === 'clear') {
    return EMPTY_CHAT_TARGET
  }

  return params.previousState.resolvedTarget ?? EMPTY_CHAT_TARGET
}

function isMissingSlotFilled(
  missingSlot: ChatMissingSlot,
  target: ChatTarget,
): boolean {
  if (missingSlot === 'target' || missingSlot === 'named_entity') {
    return target.kind !== 'none'
  }

  if (missingSlot === 'current_source') {
    return target.kind === 'current_source'
  }

  return false
}

function buildIntentFromPatch(params: {
  intentPatch: ChatIntentPatch
  target: ChatTarget
}): NormalizedChatIntent {
  return NormalizedChatIntentSchema.parse({
    standaloneQuestion: params.intentPatch.standaloneQuestion,
    operation: params.intentPatch.operation,
    target: params.target,
    temporalConstraint: params.intentPatch.temporalConstraint,
    requestedFields: buildUniqueValues(params.intentPatch.requestedFields),
    evidenceScope: params.intentPatch.evidenceScope,
    requiredConcepts: buildUniqueValues(params.intentPatch.requiredConcepts),
    optionalConcepts: buildUniqueValues(params.intentPatch.optionalConcepts),
    missingSlots: buildUniqueValues(params.intentPatch.missingSlots),
    clarificationQuestion: params.intentPatch.clarificationQuestion,
    confidence: params.intentPatch.confidence,
    reason: params.intentPatch.reason,
  })
}

function resumePendingIntent(params: {
  previousState: ChatConversationState
  intentPatch: ChatIntentPatch
  target: ChatTarget
}): NormalizedChatIntent | null {
  const pendingClarification = params.previousState.pendingClarification

  if (!pendingClarification) {
    return null
  }

  const remainingMissingSlots = pendingClarification.missingSlots.filter(
    (missingSlot) => {
      return !isMissingSlotFilled(missingSlot, params.target)
    },
  )

  if (remainingMissingSlots.length > 0) {
    return null
  }

  return NormalizedChatIntentSchema.parse({
    ...pendingClarification.suspendedIntent,
    target: params.target,
    missingSlots: [],
    clarificationQuestion: null,
    confidence: params.intentPatch.confidence,
    reason: params.intentPatch.reason,
  })
}

function buildNextConversationState(params: {
  previousState: ChatConversationState
  intent: NormalizedChatIntent
}): ChatConversationState {
  const hasMissingSlots = params.intent.missingSlots.length > 0
  const clarificationQuestion =
    params.intent.clarificationQuestion ??
    CHAT_STATE_REDUCTION.FALLBACK_CLARIFICATION_QUESTION

  return {
    version: CHAT_CONVERSATION_STATE_VERSION,
    resolvedTarget:
      params.intent.target.kind === 'none' ? null : params.intent.target,
    activeOperation: params.intent.operation,
    temporalConstraint: params.intent.temporalConstraint,
    requestedFields: params.intent.requestedFields,
    requiredConcepts: params.intent.requiredConcepts,
    optionalConcepts: params.intent.optionalConcepts,
    evidenceScope: params.intent.evidenceScope,
    pendingClarification: hasMissingSlots
      ? {
          missingSlots: params.intent.missingSlots,
          clarificationQuestion,
          suspendedIntent: {
            ...params.intent,
            clarificationQuestion,
          },
        }
      : null,
    lastResolvedQuestion: hasMissingSlots
      ? params.previousState.lastResolvedQuestion
      : params.intent.standaloneQuestion,
  }
}

export function reduceChatConversationState({
  previousState,
  intentPatch,
}: ReduceChatConversationStateParams): ReduceChatConversationStateResult {
  const target = resolveUpdatedTarget({ previousState, intentPatch })
  const resumedIntent = resumePendingIntent({
    previousState,
    intentPatch,
    target,
  })
  const intent =
    resumedIntent ?? buildIntentFromPatch({ intentPatch, target })

  return {
    intent,
    nextState: buildNextConversationState({
      previousState,
      intent,
    }),
  }
}

export function buildIntentFromConversationState(params: {
  question: string
  state: ChatConversationState
}): NormalizedChatIntent | null {
  if (params.state.pendingClarification) {
    return null
  }

  if (
    params.state.requestedFields.length === 0 ||
    params.state.evidenceScope === 'none'
  ) {
    return null
  }

  if (
    (params.state.evidenceScope === 'entity' ||
      params.state.evidenceScope === 'current_source') &&
    !params.state.resolvedTarget
  ) {
    return null
  }

  return NormalizedChatIntentSchema.parse({
    standaloneQuestion: params.state.lastResolvedQuestion ?? params.question,
    operation: params.state.activeOperation,
    target: params.state.resolvedTarget ?? EMPTY_CHAT_TARGET,
    temporalConstraint: params.state.temporalConstraint,
    requestedFields: params.state.requestedFields,
    evidenceScope: params.state.evidenceScope,
    requiredConcepts: params.state.requiredConcepts,
    optionalConcepts: params.state.optionalConcepts,
    missingSlots: [],
    clarificationQuestion: null,
    confidence: 'high',
    reason: CHAT_STATE_REDUCTION.RESTORED_STATE_REASON,
  })
}
