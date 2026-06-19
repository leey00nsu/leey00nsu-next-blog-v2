import type { ChatConversationState } from '@/features/chat/model/chat-conversation-state'
import type { ChatEntityCandidate } from '@/features/chat/model/chat-entity-candidate'
import type {
  ChatTarget,
  NormalizedChatIntent,
} from '@/features/chat/model/chat-intent'
import type {
  ChatQueryOperation,
  ChatQueryPlan,
  ChatSourceSelection,
  ChatTemporalSelection,
} from '@/features/chat/model/chat-query-plan'
import {
  type ChatExecutionKind,
  type ChatRetrievalPlan,
  ChatRetrievalPlanSchema,
} from '@/features/chat/model/chat-retrieval-plan'
import { reduceChatConversationState } from '@/features/chat/model/reduce-chat-conversation-state'

interface CompileChatRetrievalPlanParams {
  queryPlan: ChatQueryPlan
  candidates: ChatEntityCandidate[]
  previousState: ChatConversationState
  maximumEvidenceCount: number
  currentPostSlug?: string
}

export type CompileChatRetrievalPlanFailureKind =
  | 'invalid_query_plan'
  | 'invalid_candidate'
  | 'invalid_transition'

export type CompileChatRetrievalPlanResult =
  | {
      ok: true
      queryPlan: ChatQueryPlan
      retrievalPlan: ChatRetrievalPlan
      nextConversationState: ChatConversationState
      contextAction: ChatQueryPlan['contextAction']
    }
  | {
      ok: false
      failureKind: CompileChatRetrievalPlanFailureKind
      nextConversationState: ChatConversationState
    }

const EMPTY_CHAT_TARGET: ChatTarget = {
  kind: 'none',
  sourceCategory: null,
  slug: null,
  title: null,
}

const DIRECT_METADATA_FIELDS = new Set(['title', 'published_at'])

function mapLegacyOperation(
  operation: NonNullable<ChatConversationState['lastIntent']>['operation'],
): ChatQueryOperation {
  return operation === 'answer' ? 'lookup' : operation
}

function resolveEffectiveQueryPlan(params: {
  queryPlan: ChatQueryPlan
  previousState: ChatConversationState
}): ChatQueryPlan {
  if (params.queryPlan.contextAction !== 'resolve_clarification') {
    return params.queryPlan
  }

  const suspendedIntent =
    params.previousState.pendingClarification?.suspendedIntent

  if (!suspendedIntent) {
    return params.queryPlan
  }

  const temporalSelection: ChatTemporalSelection =
    suspendedIntent.temporalConstraint.order === 'none'
      ? { mode: 'none' }
      : {
          mode: 'rank',
          order: suspendedIntent.temporalConstraint.order,
        }

  return {
    ...params.queryPlan,
    standaloneQuestion: suspendedIntent.standaloneQuestion,
    operation: mapLegacyOperation(suspendedIntent.operation),
    sourceSelection: { mode: 'all' },
    temporalSelection,
    requestedFields: suspendedIntent.requestedFields,
    requiredConcepts: suspendedIntent.requiredConcepts,
    optionalConcepts: suspendedIntent.optionalConcepts,
    missingSlots: [],
    clarificationQuestion: null,
  }
}

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

function resolveCanonicalTarget(params: {
  queryPlan: ChatQueryPlan
  candidates: ChatEntityCandidate[]
  previousState: ChatConversationState
  currentPostSlug?: string
}):
  | { ok: true; target: ChatTarget }
  | { ok: false; failureKind: CompileChatRetrievalPlanFailureKind } {
  const targetSelection = params.queryPlan.targetSelection

  if (targetSelection.kind === 'candidate') {
    const candidate = params.candidates.find((currentCandidate) => {
      return currentCandidate.entityId === targetSelection.entityId
    })

    return candidate
      ? { ok: true, target: resolveCandidateTarget(candidate) }
      : { ok: false, failureKind: 'invalid_candidate' }
  }

  if (targetSelection.kind === 'preserve') {
    return params.previousState.focusedTarget
      ? { ok: true, target: params.previousState.focusedTarget }
      : { ok: false, failureKind: 'invalid_transition' }
  }

  if (targetSelection.kind === 'current_source') {
    return params.currentPostSlug
      ? {
          ok: true,
          target: {
            kind: 'current_source',
            sourceCategory: 'blog',
            slug: params.currentPostSlug,
            title: null,
          },
        }
      : { ok: false, failureKind: 'invalid_query_plan' }
  }

  return { ok: true, target: EMPTY_CHAT_TARGET }
}

function resolveSourceSelection(params: {
  sourceSelection: ChatSourceSelection
  target: ChatTarget
}):
  | {
      ok: true
      sourceStrategy: ChatRetrievalPlan['sourceStrategy']
      sourceCategories: ChatRetrievalPlan['sourceCategories']
    }
  | { ok: false; failureKind: 'invalid_query_plan' } {
  const targetSourceCategory = params.target.sourceCategory

  if (params.sourceSelection.mode === 'all') {
    return targetSourceCategory
      ? {
          ok: true,
          sourceStrategy: 'prefer',
          sourceCategories: [targetSourceCategory],
        }
      : { ok: true, sourceStrategy: 'all', sourceCategories: [] }
  }

  if (
    params.sourceSelection.mode === 'only' &&
    targetSourceCategory &&
    !params.sourceSelection.categories.includes(targetSourceCategory)
  ) {
    return { ok: false, failureKind: 'invalid_query_plan' }
  }

  const sourceCategories = targetSourceCategory
    ? [...new Set([...params.sourceSelection.categories, targetSourceCategory])]
    : params.sourceSelection.categories

  return {
    ok: true,
    sourceStrategy: params.sourceSelection.mode,
    sourceCategories,
  }
}

function resolveExecutionKind(queryPlan: ChatQueryPlan): ChatExecutionKind {
  if (queryPlan.missingSlots.length > 0) {
    return 'clarification'
  }

  if (queryPlan.operation === 'social_reply') {
    return 'social_reply'
  }

  if (queryPlan.operation === 'contact') {
    return 'contact'
  }

  const isDirectMetadataLookup =
    queryPlan.operation === 'lookup' &&
    queryPlan.temporalSelection.mode === 'single' &&
    queryPlan.requestedFields.length > 0 &&
    queryPlan.requestedFields.every((requestedField) => {
      return DIRECT_METADATA_FIELDS.has(requestedField)
    })

  return isDirectMetadataLookup ? 'direct_metadata' : 'retrieve_and_generate'
}

function isValidTransition(params: {
  queryPlan: ChatQueryPlan
  previousState: ChatConversationState
}): boolean {
  if (
    params.queryPlan.contextAction === 'reset' &&
    params.queryPlan.targetSelection.kind === 'preserve'
  ) {
    return false
  }

  if (params.queryPlan.contextAction === 'resolve_clarification') {
    return Boolean(params.previousState.pendingClarification)
  }

  if (
    params.queryPlan.contextAction === 'continue' &&
    params.queryPlan.targetSelection.kind === 'preserve'
  ) {
    return Boolean(params.previousState.focusedTarget)
  }

  return true
}

function isValidClarification(queryPlan: ChatQueryPlan): boolean {
  return (
    queryPlan.missingSlots.length > 0 ===
    Boolean(queryPlan.clarificationQuestion)
  )
}

function hasRequiredRequestedFields(queryPlan: ChatQueryPlan): boolean {
  if (
    queryPlan.missingSlots.length > 0 ||
    queryPlan.operation === 'social_reply' ||
    queryPlan.operation === 'contact'
  ) {
    return true
  }

  return queryPlan.requestedFields.length > 0
}

function buildCompatibilityIntent(params: {
  queryPlan: ChatQueryPlan
  target: ChatTarget
}): NormalizedChatIntent {
  const temporalOrder: NormalizedChatIntent['temporalConstraint']['order'] =
    params.queryPlan.temporalSelection.mode === 'none'
      ? 'none'
      : params.queryPlan.temporalSelection.order
  const evidenceScope: NormalizedChatIntent['evidenceScope'] =
    params.target.kind === 'current_source'
      ? 'current_source'
      : params.target.kind !== 'none'
        ? 'entity'
        : params.queryPlan.operation === 'social_reply'
          ? 'none'
          : 'corpus'

  return {
    standaloneQuestion: params.queryPlan.standaloneQuestion,
    operation:
      params.queryPlan.operation === 'lookup'
        ? ('answer' as const)
        : params.queryPlan.operation,
    target: params.target,
    temporalConstraint: { order: temporalOrder },
    requestedFields: params.queryPlan.requestedFields,
    evidenceScope,
    requiredConcepts: params.queryPlan.requiredConcepts,
    optionalConcepts: params.queryPlan.optionalConcepts,
    missingSlots: params.queryPlan.missingSlots,
    clarificationQuestion: params.queryPlan.clarificationQuestion,
    confidence: params.queryPlan.confidence,
    reason: params.queryPlan.reason,
  }
}

export function compileChatRetrievalPlan(
  params: CompileChatRetrievalPlanParams,
): CompileChatRetrievalPlanResult {
  if (!isValidTransition(params) || !isValidClarification(params.queryPlan)) {
    return {
      ok: false,
      failureKind: isValidTransition(params)
        ? 'invalid_query_plan'
        : 'invalid_transition',
      nextConversationState: params.previousState,
    }
  }

  const queryPlan = resolveEffectiveQueryPlan(params)

  if (!hasRequiredRequestedFields(queryPlan)) {
    return {
      ok: false,
      failureKind: 'invalid_query_plan',
      nextConversationState: params.previousState,
    }
  }

  const targetResult = resolveCanonicalTarget({ ...params, queryPlan })

  if (!targetResult.ok) {
    return {
      ok: false,
      failureKind: targetResult.failureKind,
      nextConversationState: params.previousState,
    }
  }

  const sourceResult = resolveSourceSelection({
    sourceSelection: queryPlan.sourceSelection,
    target: targetResult.target,
  })

  if (!sourceResult.ok) {
    return {
      ok: false,
      failureKind: sourceResult.failureKind,
      nextConversationState: params.previousState,
    }
  }

  const temporalStrategy = queryPlan.temporalSelection.mode
  const temporalOrder =
    queryPlan.temporalSelection.mode === 'none'
      ? null
      : queryPlan.temporalSelection.order
  const retrievalPlan = ChatRetrievalPlanSchema.parse({
    executionKind: resolveExecutionKind(queryPlan),
    standaloneQuestion: queryPlan.standaloneQuestion,
    operation: queryPlan.operation,
    canonicalTargets:
      targetResult.target.kind === 'none' ? [] : [targetResult.target],
    sourceStrategy: sourceResult.sourceStrategy,
    sourceCategories: sourceResult.sourceCategories,
    requiredConcepts: queryPlan.requiredConcepts,
    optionalConcepts: queryPlan.optionalConcepts,
    requestedFields: queryPlan.requestedFields,
    temporalStrategy,
    temporalOrder,
    maximumEvidenceCount: params.maximumEvidenceCount,
  })
  const reducedState = reduceChatConversationState({
    previousState: params.previousState,
    contextAction: queryPlan.contextAction,
    intent: buildCompatibilityIntent({
      queryPlan,
      target: targetResult.target,
    }),
  })

  return {
    ok: true,
    queryPlan,
    retrievalPlan,
    nextConversationState: reducedState.nextState,
    contextAction: queryPlan.contextAction,
  }
}
