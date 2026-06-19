import 'dotenv/config'
import { GENERATED_BLOG_SEARCH_RECORDS } from '@/entities/post/config/blog-search-records.generated'
import { planChatIntent } from '@/features/chat/api/plan-chat-intent-patch'
import { CHAT_PLANNER_GOLDEN_CASES } from '@/features/chat/fixtures/chat-planner-evaluation'
import { matchChatEntityCandidates } from '@/features/chat/lib/match-chat-entity-candidates'
import { resolveChatIntentRequest } from '@/features/chat/lib/resolve-chat-intent-request'
import { EMPTY_CHAT_CONVERSATION_STATE } from '@/features/chat/model/chat-conversation-state'
import type { ChatConversationState } from '@/features/chat/model/chat-conversation-state'
import type { ChatConversationHistoryItem } from '@/features/chat/model/chat-conversation-history'
import { getChatEntityCandidates } from '@/features/chat/model/get-chat-entity-candidates'
import { getCuratedChatSources } from '@/features/chat/model/get-curated-chat-sources'
import { normalizeChatIntentPlan } from '@/features/chat/model/normalize-chat-intent-plan'
import { reduceChatConversationState } from '@/features/chat/model/reduce-chat-conversation-state'

interface PlannerEvaluationResult {
  id: string
  passed: boolean
  failures: string[]
  actual?: {
    contextAction: string
    entityId: string | null
    evidenceScope: string
    operation: string
    temporalOrder: string
    requestedFields: string[]
    requiredConcepts: string[]
    missingSlots: string[]
    clarificationQuestion: string | null
    executionKind?: string
    sourceCategories?: string[]
  }
}

async function evaluatePlannerCase(
  goldenCase: (typeof CHAT_PLANNER_GOLDEN_CASES)[number],
): Promise<PlannerEvaluationResult> {
  const allCandidates = await getChatEntityCandidates(goldenCase.locale)
  const candidates = matchChatEntityCandidates({
    question: goldenCase.question,
    candidates: allCandidates,
  })
  const plannerResult = await planChatIntent({
    question: goldenCase.question,
    locale: goldenCase.locale,
    conversationState: EMPTY_CHAT_CONVERSATION_STATE,
    entityCandidates: candidates,
  })

  if (!plannerResult.ok) {
    return {
      id: goldenCase.id,
      passed: false,
      failures: [plannerResult.failureKind],
    }
  }

  const normalized = normalizeChatIntentPlan({
    intentPlan: plannerResult.intentPlan,
    candidates,
    previousState: EMPTY_CHAT_CONVERSATION_STATE,
  })

  if (!normalized.ok) {
    return {
      id: goldenCase.id,
      passed: false,
      failures: [normalized.failureKind],
    }
  }

  const failures: string[] = []
  const selectedEntityId =
    plannerResult.intentPlan.targetSelection.kind === 'candidate'
      ? plannerResult.intentPlan.targetSelection.entityId
      : null

  if (normalized.contextAction !== goldenCase.expectedContextAction) {
    failures.push('context_action')
  }
  if (selectedEntityId !== goldenCase.expectedEntityId) {
    failures.push('entity_id')
  }
  if (normalized.intent.evidenceScope !== goldenCase.expectedEvidenceScope) {
    failures.push('evidence_scope')
  }
  if (!goldenCase.expectedOperations.includes(normalized.intent.operation)) {
    failures.push('operation')
  }
  if (
    normalized.intent.temporalConstraint.order !==
    goldenCase.expectedTemporalOrder
  ) {
    failures.push('temporal_order')
  }
  if (
    !goldenCase.expectedAnyRequestedFields.some((requestedField) => {
      return normalized.intent.requestedFields.includes(requestedField)
    })
  ) {
    failures.push('requested_fields')
  }
  if (
    (goldenCase.forbiddenRequestedFields ?? []).some((requestedField) => {
      return normalized.intent.requestedFields.includes(requestedField)
    })
  ) {
    failures.push('forbidden_requested_fields')
  }
  if (
    !goldenCase.expectedRequiredConcepts.every((requiredConcept) => {
      return normalized.intent.requiredConcepts.includes(requiredConcept)
    })
  ) {
    failures.push('required_concepts')
  }
  if (
    normalized.intent.missingSlots.length > 0 !==
    goldenCase.expectClarification
  ) {
    failures.push('clarification')
  }

  let executionKind: string | undefined
  let sourceCategories: string[] | undefined

  if (goldenCase.expectedExecutionKind) {
    const curatedRecords = await getCuratedChatSources(goldenCase.locale)
    const blogRecords = GENERATED_BLOG_SEARCH_RECORDS[goldenCase.locale].map(
      (record) => {
        return { ...record, sourceCategory: 'blog' as const }
      },
    )
    const resolvedRequest = resolveChatIntentRequest({
      intent: normalized.intent,
      locale: goldenCase.locale,
      blogRecords,
      curatedRecords,
    })
    executionKind = resolvedRequest.directResponse
      ? 'direct'
      : resolvedRequest.shouldCallModel
        ? 'model'
        : 'refusal'
    sourceCategories = [
      ...new Set(resolvedRequest.matches.map((match) => match.sourceCategory)),
    ]

    if (executionKind !== goldenCase.expectedExecutionKind) {
      failures.push('execution_kind')
    }
    if (
      !(goldenCase.expectedSourceCategories ?? []).every((sourceCategory) => {
        return sourceCategories?.includes(sourceCategory)
      })
    ) {
      failures.push('source_categories')
    }
  }

  return {
    id: goldenCase.id,
    passed: failures.length === 0,
    failures,
    actual: {
      contextAction: normalized.contextAction,
      entityId: selectedEntityId,
      evidenceScope: normalized.intent.evidenceScope,
      operation: normalized.intent.operation,
      temporalOrder: normalized.intent.temporalConstraint.order,
      requestedFields: normalized.intent.requestedFields,
      requiredConcepts: normalized.intent.requiredConcepts,
      missingSlots: normalized.intent.missingSlots,
      clarificationQuestion: normalized.intent.clarificationQuestion,
      executionKind,
      sourceCategories,
    },
  }
}

async function evaluateConversationScenario(): Promise<PlannerEvaluationResult> {
  const turns = [
    {
      question: '이 사람 Vercel 써봤어?',
      expectedContextAction: 'reset',
      expectedTargetSlug: null,
      expectClarification: true,
    },
    {
      question: '블로그 주인',
      expectedContextAction: 'resolve_clarification',
      expectedTargetSlug: 'about',
      expectClarification: false,
    },
    {
      question: '왜 그만 썼어?',
      expectedContextAction: 'continue',
      expectedTargetSlug: 'about',
      expectClarification: false,
    },
    {
      question: 'Leemage에서 Presigned URL을 사용한 이유는?',
      expectedContextAction: 'reset',
      expectedTargetSlug: 'leemage',
      expectClarification: false,
    },
  ] as const
  const allCandidates = await getChatEntityCandidates('ko')
  const history: ChatConversationHistoryItem[] = []
  const failures: string[] = []
  let state: ChatConversationState = EMPTY_CHAT_CONVERSATION_STATE
  let lastActual: PlannerEvaluationResult['actual']

  for (const [turnIndex, turn] of turns.entries()) {
    const candidates = matchChatEntityCandidates({
      question: turn.question,
      candidates: allCandidates,
    })
    const plannerResult = await planChatIntent({
      question: turn.question,
      locale: 'ko',
      conversationState: state,
      conversationHistory: history.slice(-2),
      entityCandidates: candidates,
    })

    if (!plannerResult.ok) {
      failures.push(`turn_${turnIndex + 1}_${plannerResult.failureKind}`)
      break
    }

    const normalized = normalizeChatIntentPlan({
      intentPlan: plannerResult.intentPlan,
      candidates,
      previousState: state,
    })

    if (!normalized.ok) {
      failures.push(`turn_${turnIndex + 1}_${normalized.failureKind}`)
      break
    }

    const hasClarification = normalized.intent.missingSlots.length > 0
    const targetSlug =
      normalized.intent.target.kind === 'none'
        ? null
        : normalized.intent.target.slug

    if (normalized.contextAction !== turn.expectedContextAction) {
      failures.push(`turn_${turnIndex + 1}_context_action`)
    }
    if (targetSlug !== turn.expectedTargetSlug) {
      failures.push(`turn_${turnIndex + 1}_target`)
    }
    if (hasClarification !== turn.expectClarification) {
      failures.push(`turn_${turnIndex + 1}_clarification`)
    }

    const reduction = reduceChatConversationState({
      previousState: state,
      contextAction: normalized.contextAction,
      intent: normalized.intent,
    })
    state = reduction.nextState
    history.push({
      question: turn.question,
      answer:
        normalized.intent.clarificationQuestion ??
        '근거를 바탕으로 답변했습니다.',
      citations: [],
    })
    lastActual = {
      contextAction: normalized.contextAction,
      entityId:
        plannerResult.intentPlan.targetSelection.kind === 'candidate'
          ? plannerResult.intentPlan.targetSelection.entityId
          : null,
      evidenceScope: reduction.intent.evidenceScope,
      operation: reduction.intent.operation,
      temporalOrder: reduction.intent.temporalConstraint.order,
      requestedFields: reduction.intent.requestedFields,
      requiredConcepts: reduction.intent.requiredConcepts,
      missingSlots: reduction.intent.missingSlots,
      clarificationQuestion: reduction.intent.clarificationQuestion,
    }
  }

  return {
    id: 'stateful-vercel-to-leemage',
    passed: failures.length === 0,
    failures,
    actual: lastActual,
  }
}

async function main(): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('missing_api_key')
  }

  const results = [
    ...(await Promise.all(
      CHAT_PLANNER_GOLDEN_CASES.map((goldenCase) => {
        return evaluatePlannerCase(goldenCase)
      }),
    )),
    await evaluateConversationScenario(),
  ]
  const failures = results.filter((result) => !result.passed)

  console.log(JSON.stringify({ results, failures }, null, 2))
  process.exitCode = failures.length > 0 ? 1 : 0
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void main().catch((error) => {
  console.error(
    JSON.stringify({
      error:
        error instanceof Error ? error.message : 'planner_evaluation_error',
    }),
  )
  process.exitCode = 1
})
