import type { ChatConversationState } from '@/features/chat/model/chat-conversation-state'
import type { ChatEntityCandidate } from '@/features/chat/model/chat-entity-candidate'
import { BLOG_CHAT } from '@/features/chat/config/constants'
import { partitionChatConceptsByRequirement } from '@/features/chat/lib/chat-required-concepts'
import type { ChatTarget } from '@/features/chat/model/chat-plan-primitives'
import type {
  ChatQueryPlan,
  ChatSourceSelection,
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

const DIRECT_METADATA_FIELDS = new Set(['title', 'published_at', 'summary'])
const DIRECT_CONTACT_FIELD = 'contact_methods'
const DIRECT_CONTACT_TARGET_KINDS = new Set<ChatTarget['kind']>([
  'none',
  'profile',
  'assistant',
])
const CHAT_TARGET_ANSWER = {
  TRAILING_PUNCTUATION_PATTERN: /[?!.,~]+$/gu,
  RESPONSE_SUFFIX_PATTERN: /(?:이요|입니다)$/gu,
  MULTIPLE_WHITESPACE_PATTERN: /\s+/gu,
} as const
const IMPLICIT_PROFILE_QUESTION_PATTERN =
  /경력|커리어|직장|근무|학력|학교|대학교|대학|전공|학점|대외\s*활동|동아리|관심사|주력\s*기술|기술\s*스택|주로\s*쓰는\s*기술/u
const DIRECT_PROFILE_QUESTION_PATTERN =
  /(?:최근|최신|마지막|어디(?:에서)?\s*(?:일|근무)|경력|직장|근무처)|학력|학교별|대외\s*활동|동아리|주력\s*기술|기술\s*스택|주로\s*쓰는\s*기술|recent|latest|last\s+(?:job|workplace)|education|school|extracurricular|club\s+experience|primary\s+tech|tech(?:nology)?\s+stack/iu
const AGGREGATE_CHAT_OPERATIONS = new Set<ChatQueryPlan['operation']>([
  'compare',
  'recommend',
  'summarize',
])

function resolveEffectiveQueryPlan(params: {
  queryPlan: ChatQueryPlan
  previousState: ChatConversationState
}): ChatQueryPlan {
  if (params.queryPlan.contextAction !== 'resolve_clarification') {
    return params.queryPlan
  }

  const suspendedQueryPlan =
    params.previousState.pendingClarification?.suspendedQueryPlan

  if (!suspendedQueryPlan) {
    return params.queryPlan
  }

  return {
    ...suspendedQueryPlan,
    contextAction: 'resolve_clarification',
    targetSelection: params.queryPlan.targetSelection,
    missingSlots: [],
    clarificationQuestion: null,
    confidence: params.queryPlan.confidence,
    reason: params.queryPlan.reason,
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

function doesQuestionMentionCandidate(params: {
  question: string
  candidate: ChatEntityCandidate
}): boolean {
  const normalizedQuestion = normalizeTargetAnswer(params.question)

  return [params.candidate.title, ...params.candidate.aliases].some(
    (candidateName) => {
      const normalizedCandidateName = normalizeTargetAnswer(candidateName)

      return (
        Boolean(normalizedCandidateName) &&
        normalizedQuestion.includes(normalizedCandidateName)
      )
    },
  )
}

function resolveCanonicalTargets(params: {
  queryPlan: ChatQueryPlan
  candidates: ChatEntityCandidate[]
  primaryTarget: ChatTarget
}): ChatTarget[] {
  if (params.primaryTarget.kind === 'none') {
    return []
  }

  const targetMap = new Map<string, ChatTarget>()
  const addTarget = (target: ChatTarget) => {
    targetMap.set(
      `${target.sourceCategory ?? 'none'}/${target.slug ?? 'none'}`,
      target,
    )
  }

  addTarget(params.primaryTarget)

  if (params.queryPlan.operation === 'compare') {
    for (const candidate of params.candidates) {
      if (
        doesQuestionMentionCandidate({
          question: params.queryPlan.standaloneQuestion,
          candidate,
        })
      ) {
        addTarget(resolveCandidateTarget(candidate))
      }
    }
  }

  return [...targetMap.values()]
}

function normalizeQueryPlanConceptRequirements(
  queryPlan: ChatQueryPlan,
): ChatQueryPlan {
  const concepts = partitionChatConceptsByRequirement({
    requiredConcepts: queryPlan.requiredConcepts,
    optionalConcepts: queryPlan.optionalConcepts,
  })

  return {
    ...queryPlan,
    requiredConcepts: concepts.requiredConcepts,
    optionalConcepts: concepts.optionalConcepts,
  }
}

function normalizeImplicitProfileSourceSelection(
  queryPlan: ChatQueryPlan,
  candidates: ChatEntityCandidate[],
): ChatQueryPlan {
  const hasNoCanonicalTarget = queryPlan.targetSelection.kind === 'none'
  const selectedCandidateEntityId =
    queryPlan.targetSelection.kind === 'candidate'
      ? queryPlan.targetSelection.entityId
      : null
  const hasProfileCandidateTarget =
    selectedCandidateEntityId !== null &&
    candidates.some((candidate) => {
      return (
        candidate.entityId === selectedCandidateEntityId &&
        candidate.kind === 'profile'
      )
    })
  const asksForProfileField = IMPLICIT_PROFILE_QUESTION_PATTERN.test(
    queryPlan.standaloneQuestion,
  )

  if (
    (!hasNoCanonicalTarget && !hasProfileCandidateTarget) ||
    !asksForProfileField
  ) {
    return queryPlan
  }

  return {
    ...queryPlan,
    sourceSelection: {
      mode: 'only',
      categories: ['profile'],
    },
  }
}

function doesConceptReferenceTarget(
  concept: string,
  target: ChatTarget,
): boolean {
  const normalizedConcept = normalizeTargetAnswer(concept)
  const targetNames = [target.title ?? '', target.slug ?? '']

  return targetNames.some((targetName) => {
    const normalizedTargetName = normalizeTargetAnswer(targetName)

    return (
      Boolean(normalizedTargetName) &&
      normalizedConcept.includes(normalizedTargetName)
    )
  })
}

function normalizeQueryPlanTargetConcepts(params: {
  queryPlan: ChatQueryPlan
  targets: ChatTarget[]
}): ChatQueryPlan {
  const targetConcepts = params.queryPlan.requiredConcepts.filter((concept) => {
    return params.targets.some((target) => {
      return doesConceptReferenceTarget(concept, target)
    })
  })

  if (targetConcepts.length === 0) {
    return params.queryPlan
  }

  const targetConceptSet = new Set(targetConcepts)

  return {
    ...params.queryPlan,
    requiredConcepts: params.queryPlan.requiredConcepts.filter((concept) => {
      return !targetConceptSet.has(concept)
    }),
    optionalConcepts: [
      ...new Set([...params.queryPlan.optionalConcepts, ...targetConcepts]),
    ],
  }
}

function resolveMaximumEvidenceCount(params: {
  queryPlan: ChatQueryPlan
  maximumEvidenceCount: number
}): number {
  return AGGREGATE_CHAT_OPERATIONS.has(params.queryPlan.operation)
    ? Math.max(params.maximumEvidenceCount, BLOG_CHAT.SEARCH.AGGREGATE_TOP_K)
    : params.maximumEvidenceCount
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

function resolveExecutionKind(params: {
  queryPlan: ChatQueryPlan
  target: ChatTarget
}): ChatExecutionKind {
  const queryPlan = params.queryPlan

  if (queryPlan.missingSlots.length > 0) {
    return 'clarification'
  }

  if (queryPlan.operation === 'social_reply') {
    return 'social_reply'
  }

  if (queryPlan.operation === 'identity') {
    return 'identity'
  }

  if (queryPlan.operation === 'owner_identity') {
    return 'owner_identity'
  }

  if (
    (queryPlan.operation === 'contact' ||
      queryPlan.requestedFields.includes(DIRECT_CONTACT_FIELD)) &&
    DIRECT_CONTACT_TARGET_KINDS.has(params.target.kind)
  ) {
    return 'contact'
  }

  const isDirectProfileLookup =
    queryPlan.sourceSelection.mode === 'only' &&
    queryPlan.sourceSelection.categories.includes('profile') &&
    DIRECT_PROFILE_QUESTION_PATTERN.test(queryPlan.standaloneQuestion)

  if (isDirectProfileLookup) {
    return 'direct_profile'
  }

  const isDirectMetadataLookup =
    queryPlan.operation === 'lookup' &&
    queryPlan.temporalSelection.mode === 'single' &&
    queryPlan.requestedFields.length > 0 &&
    queryPlan.requestedFields.every((requestedField) => {
      return DIRECT_METADATA_FIELDS.has(requestedField)
    })
  const isDirectTemporalProjectLookup =
    queryPlan.operation === 'lookup' &&
    queryPlan.temporalSelection.mode === 'single' &&
    queryPlan.sourceSelection.mode === 'only' &&
    queryPlan.sourceSelection.categories.includes('project') &&
    queryPlan.requestedFields.includes('title')

  return isDirectMetadataLookup || isDirectTemporalProjectLookup
    ? 'direct_metadata'
    : 'retrieve_and_generate'
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

function normalizeTargetAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(CHAT_TARGET_ANSWER.TRAILING_PUNCTUATION_PATTERN, '')
    .replaceAll(CHAT_TARGET_ANSWER.RESPONSE_SUFFIX_PATTERN, '')
    .replaceAll(CHAT_TARGET_ANSWER.MULTIPLE_WHITESPACE_PATTERN, ' ')
    .trim()
}

function isSelectedCandidateTargetAnswer(params: {
  queryPlan: ChatQueryPlan
  candidates: ChatEntityCandidate[]
}): boolean {
  const targetSelection = params.queryPlan.targetSelection

  if (targetSelection.kind !== 'candidate') {
    return false
  }

  const selectedCandidate = params.candidates.find((candidate) => {
    return candidate.entityId === targetSelection.entityId
  })

  if (!selectedCandidate) {
    return false
  }

  const normalizedQuestion = normalizeTargetAnswer(
    params.queryPlan.standaloneQuestion,
  )
  const candidateNames = [
    selectedCandidate.title,
    ...selectedCandidate.aliases,
  ].map((candidateName) => normalizeTargetAnswer(candidateName))

  return candidateNames.includes(normalizedQuestion)
}

function normalizeContextAction(params: {
  queryPlan: ChatQueryPlan
  previousState: ChatConversationState
  candidates: ChatEntityCandidate[]
}): ChatQueryPlan {
  const suspendedQueryPlan =
    params.previousState.pendingClarification?.suspendedQueryPlan
  const suppliesPendingTarget =
    suspendedQueryPlan?.missingSlots.includes('target') &&
    params.queryPlan.contextAction === 'reset' &&
    params.queryPlan.missingSlots.length === 0 &&
    isSelectedCandidateTargetAnswer(params)

  if (suppliesPendingTarget) {
    return {
      ...params.queryPlan,
      contextAction: 'resolve_clarification',
    }
  }

  if (
    params.queryPlan.contextAction === 'resolve_clarification' &&
    params.previousState.pendingClarification &&
    !isSelectedCandidateTargetAnswer(params)
  ) {
    return {
      ...params.queryPlan,
      contextAction: 'reset',
    }
  }

  if (
    params.queryPlan.contextAction === 'resolve_clarification' &&
    !params.previousState.pendingClarification &&
    params.queryPlan.missingSlots.length > 0
  ) {
    return { ...params.queryPlan, contextAction: 'reset' }
  }

  if (
    params.queryPlan.contextAction === 'continue' &&
    !params.previousState.focusedTarget &&
    !params.previousState.pendingClarification
  ) {
    return { ...params.queryPlan, contextAction: 'reset' }
  }

  return params.queryPlan
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
    queryPlan.operation === 'identity' ||
    queryPlan.operation === 'owner_identity' ||
    queryPlan.operation === 'contact'
  ) {
    return true
  }

  return queryPlan.requestedFields.length > 0
}

export function compileChatRetrievalPlan(
  params: CompileChatRetrievalPlanParams,
): CompileChatRetrievalPlanResult {
  const contextNormalizedQueryPlan = normalizeContextAction(params)
  const normalizedParams = {
    ...params,
    queryPlan: contextNormalizedQueryPlan,
  }

  if (
    !isValidTransition(normalizedParams) ||
    !isValidClarification(contextNormalizedQueryPlan)
  ) {
    return {
      ok: false,
      failureKind: isValidTransition(normalizedParams)
        ? 'invalid_query_plan'
        : 'invalid_transition',
      nextConversationState: params.previousState,
    }
  }

  const queryPlan = normalizeImplicitProfileSourceSelection(
    normalizeQueryPlanConceptRequirements(
      resolveEffectiveQueryPlan(normalizedParams),
    ),
    params.candidates,
  )

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
  const canonicalTargets = resolveCanonicalTargets({
    queryPlan,
    candidates: params.candidates,
    primaryTarget: targetResult.target,
  })
  const targetNormalizedQueryPlan = normalizeQueryPlanTargetConcepts({
    queryPlan,
    targets: canonicalTargets,
  })
  const retrievalPlan = ChatRetrievalPlanSchema.parse({
    executionKind: resolveExecutionKind({
      queryPlan: targetNormalizedQueryPlan,
      target: targetResult.target,
    }),
    standaloneQuestion: targetNormalizedQueryPlan.standaloneQuestion,
    operation: targetNormalizedQueryPlan.operation,
    canonicalTargets,
    sourceStrategy: sourceResult.sourceStrategy,
    sourceCategories: sourceResult.sourceCategories,
    requiredConcepts: targetNormalizedQueryPlan.requiredConcepts,
    optionalConcepts: targetNormalizedQueryPlan.optionalConcepts,
    requestedFields: targetNormalizedQueryPlan.requestedFields,
    temporalStrategy,
    temporalOrder,
    maximumEvidenceCount: resolveMaximumEvidenceCount({
      queryPlan: targetNormalizedQueryPlan,
      maximumEvidenceCount: params.maximumEvidenceCount,
    }),
  })
  const nextConversationState = reduceChatConversationState({
    queryPlan: targetNormalizedQueryPlan,
    target: targetResult.target,
  })

  return {
    ok: true,
    queryPlan: targetNormalizedQueryPlan,
    retrievalPlan,
    nextConversationState,
    contextAction: targetNormalizedQueryPlan.contextAction,
  }
}
