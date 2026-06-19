import type { ChatEntityCandidate } from '@/features/chat/model/chat-entity-candidate'
import type { ChatConversationState } from '@/features/chat/model/chat-conversation-state'
import {
  type ChatContextAction,
  type ChatIntentPlan,
  type ChatTarget,
  NormalizedChatIntentSchema,
  type NormalizedChatIntent,
} from '@/features/chat/model/chat-intent'

const EMPTY_CHAT_TARGET: ChatTarget = {
  kind: 'none',
  sourceCategory: null,
  slug: null,
  title: null,
}

export type NormalizeChatIntentPlanFailureKind =
  | 'invalid_candidate'
  | 'invalid_intent_plan'
  | 'invalid_transition'

export type NormalizeChatIntentPlanResult =
  | {
      ok: true
      intent: NormalizedChatIntent
      contextAction: ChatContextAction
    }
  | { ok: false; failureKind: NormalizeChatIntentPlanFailureKind }

function resolveCandidateTarget(candidate: ChatEntityCandidate): ChatTarget {
  return {
    kind:
      candidate.kind === 'profile' || candidate.kind === 'assistant'
        ? candidate.kind
        : 'named_entity',
    sourceCategory: candidate.sourceCategory,
    slug: candidate.slug,
    title: candidate.title,
  }
}

function resolveTarget(params: {
  intentPlan: ChatIntentPlan
  candidates: ChatEntityCandidate[]
  previousState: ChatConversationState
  currentPostSlug?: string
}):
  | { ok: true; target: ChatTarget }
  | { ok: false; failureKind: 'invalid_candidate' } {
  if (params.intentPlan.targetSelection.kind === 'candidate') {
    const selectedEntityId = params.intentPlan.targetSelection.entityId
    const candidate = params.candidates.find((currentCandidate) => {
      return currentCandidate.entityId === selectedEntityId
    })

    return candidate
      ? { ok: true, target: resolveCandidateTarget(candidate) }
      : { ok: false, failureKind: 'invalid_candidate' }
  }

  if (params.intentPlan.targetSelection.kind === 'preserve') {
    return {
      ok: true,
      target: params.previousState.focusedTarget ?? EMPTY_CHAT_TARGET,
    }
  }

  if (
    params.intentPlan.evidenceScope === 'current_source' &&
    params.currentPostSlug
  ) {
    return {
      ok: true,
      target: {
        kind: 'current_source',
        sourceCategory: 'blog',
        slug: params.currentPostSlug,
        title: null,
      },
    }
  }

  return { ok: true, target: EMPTY_CHAT_TARGET }
}

function resolveEvidenceScope(params: {
  intentPlan: ChatIntentPlan
  target: ChatTarget
}): ChatIntentPlan['evidenceScope'] {
  if (params.target.kind === 'current_source') {
    return 'current_source'
  }

  if (params.target.kind !== 'none') {
    return 'entity'
  }

  return params.intentPlan.evidenceScope
}

function isEvidenceOperation(operation: ChatIntentPlan['operation']): boolean {
  return operation !== 'social_reply' && operation !== 'contact'
}

function normalizeRequiredConcepts(concepts: string[]): string[] {
  return [
    ...new Set(
      concepts.map((concept) => {
        const latinTokens = concept.match(/[A-Za-z][A-Za-z0-9.+#-]*/g) ?? []
        const containsKorean = /[가-힣]/.test(concept)

        return containsKorean && latinTokens.length === 1
          ? latinTokens[0]
          : concept
      }),
    ),
  ]
}

function normalizeContextAction(params: {
  intentPlan: ChatIntentPlan
  previousState: ChatConversationState
  target: ChatTarget
}): ChatContextAction {
  if (
    params.intentPlan.contextAction === 'resolve_clarification' &&
    !params.previousState.pendingClarification
  ) {
    return 'reset'
  }

  if (
    params.intentPlan.contextAction === 'continue' &&
    !params.previousState.focusedTarget &&
    !params.previousState.pendingClarification
  ) {
    return 'reset'
  }

  if (
    params.intentPlan.contextAction === 'continue' &&
    params.intentPlan.targetSelection.kind === 'candidate' &&
    params.previousState.focusedTarget?.slug !== params.target.slug
  ) {
    return 'reset'
  }

  return params.intentPlan.contextAction
}

function normalizeMissingSlots(params: {
  intentPlan: ChatIntentPlan
  target: ChatTarget
  evidenceScope: ChatIntentPlan['evidenceScope']
}): ChatIntentPlan['missingSlots'] {
  return params.intentPlan.missingSlots.filter((missingSlot) => {
    if (
      params.evidenceScope === 'corpus' &&
      (missingSlot === 'target' ||
        missingSlot === 'named_entity' ||
        missingSlot === 'current_source')
    ) {
      return false
    }

    if (
      params.target.kind !== 'none' &&
      (missingSlot === 'target' || missingSlot === 'named_entity')
    ) {
      return false
    }

    if (
      params.target.kind === 'current_source' &&
      missingSlot === 'current_source'
    ) {
      return false
    }

    return true
  })
}

function isTopicalCorpusContentIntent(params: {
  evidenceScope: ChatIntentPlan['evidenceScope']
  requiredConcepts: string[]
  requestedFields: ChatIntentPlan['requestedFields']
}): boolean {
  return (
    params.evidenceScope === 'corpus' &&
    params.requiredConcepts.length > 0 &&
    params.requestedFields.some((requestedField) => {
      return requestedField === 'content' || requestedField === 'summary'
    })
  )
}

function normalizeRequestedFields(
  intentPlan: ChatIntentPlan,
): ChatIntentPlan['requestedFields'] {
  if (
    isEvidenceOperation(intentPlan.operation) &&
    intentPlan.requestedFields.length === 0
  ) {
    return ['content']
  }

  return intentPlan.requestedFields
}

export function normalizeChatIntentPlan(params: {
  intentPlan: ChatIntentPlan
  candidates: ChatEntityCandidate[]
  previousState: ChatConversationState
  currentPostSlug?: string
}): NormalizeChatIntentPlanResult {
  if (
    params.intentPlan.contextAction === 'reset' &&
    params.intentPlan.targetSelection.kind === 'preserve'
  ) {
    return { ok: false, failureKind: 'invalid_transition' }
  }

  const hasMissingSlots = params.intentPlan.missingSlots.length > 0

  if (hasMissingSlots !== Boolean(params.intentPlan.clarificationQuestion)) {
    return { ok: false, failureKind: 'invalid_intent_plan' }
  }

  const targetResult = resolveTarget(params)

  if (!targetResult.ok) {
    return targetResult
  }

  const evidenceScope = resolveEvidenceScope({
    intentPlan: params.intentPlan,
    target: targetResult.target,
  })
  const missingSlots = normalizeMissingSlots({
    intentPlan: params.intentPlan,
    target: targetResult.target,
    evidenceScope,
  })
  const requiredConcepts = normalizeRequiredConcepts(
    params.intentPlan.requiredConcepts,
  )
  const requestedFields = normalizeRequestedFields(params.intentPlan)
  const isTopicalCorpusContent = isTopicalCorpusContentIntent({
    evidenceScope,
    requiredConcepts,
    requestedFields,
  })

  if (
    missingSlots.length === 0 &&
    isEvidenceOperation(params.intentPlan.operation) &&
    evidenceScope === 'none'
  ) {
    return { ok: false, failureKind: 'invalid_intent_plan' }
  }

  const parsedIntent = NormalizedChatIntentSchema.safeParse({
    ...params.intentPlan,
    contextAction: undefined,
    targetSelection: undefined,
    target: targetResult.target,
    operation:
      isTopicalCorpusContent && params.intentPlan.operation === 'answer'
        ? 'explain'
        : params.intentPlan.operation,
    evidenceScope,
    requestedFields: isTopicalCorpusContent
      ? requestedFields.filter((requestedField) => {
          return requestedField !== 'published_at'
        })
      : requestedFields,
    missingSlots,
    clarificationQuestion:
      missingSlots.length === 0
        ? null
        : params.intentPlan.clarificationQuestion,
    requiredConcepts,
  })

  return parsedIntent.success
    ? {
        ok: true,
        intent: parsedIntent.data,
        contextAction: normalizeContextAction({
          intentPlan: params.intentPlan,
          previousState: params.previousState,
          target: targetResult.target,
        }),
      }
    : { ok: false, failureKind: 'invalid_intent_plan' }
}
