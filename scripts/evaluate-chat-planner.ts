import 'dotenv/config'
import { planChatIntent } from '@/features/chat/api/plan-chat-intent-patch'
import { BLOG_CHAT } from '@/features/chat/config/constants'
import { CHAT_PLANNER_GOLDEN_CASES } from '@/features/chat/fixtures/chat-planner-evaluation'
import { matchChatEntityCandidates } from '@/features/chat/lib/match-chat-entity-candidates'
import {
  EMPTY_CHAT_CONVERSATION_STATE,
  type ChatConversationState,
} from '@/features/chat/model/chat-conversation-state'
import type { ChatConversationHistoryItem } from '@/features/chat/model/chat-conversation-history'
import { compileChatRetrievalPlan } from '@/features/chat/model/compile-chat-retrieval-plan'
import { getChatEntityCandidates } from '@/features/chat/model/get-chat-entity-candidates'

interface PlannerEvaluationActual {
  contextAction: string
  entityId: string | null
  operation: string
  sourceMode: string
  sourceCategories: string[]
  temporalMode: string
  temporalOrder: string | null
  requestedFields: string[]
  requiredConcepts: string[]
  missingSlots: string[]
  clarificationQuestion: string | null
  executionKind?: string
  targetSlug?: string | null
}

interface PlannerEvaluationResult {
  id: string
  passed: boolean
  failures: string[]
  actual?: PlannerEvaluationActual
}

function resolveSelectionCategories(
  sourceSelection: (typeof CHAT_PLANNER_GOLDEN_CASES)[number]['modelPlan']['sourceSelection'],
): string[] {
  return sourceSelection.mode === 'all' ? [] : sourceSelection.categories
}

function resolveTemporalOrder(
  temporalSelection: (typeof CHAT_PLANNER_GOLDEN_CASES)[number]['modelPlan']['temporalSelection'],
): 'latest' | 'oldest' | null {
  return temporalSelection.mode === 'none' ? null : temporalSelection.order
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

  const compiled = compileChatRetrievalPlan({
    queryPlan: plannerResult.queryPlan,
    candidates,
    previousState: EMPTY_CHAT_CONVERSATION_STATE,
    maximumEvidenceCount: BLOG_CHAT.SEARCH.TOP_K,
  })

  if (!compiled.ok) {
    const queryPlan = plannerResult.queryPlan
    return {
      id: goldenCase.id,
      passed: false,
      failures: [compiled.failureKind],
      actual: {
        contextAction: queryPlan.contextAction,
        entityId:
          queryPlan.targetSelection.kind === 'candidate'
            ? queryPlan.targetSelection.entityId
            : null,
        operation: queryPlan.operation,
        sourceMode: queryPlan.sourceSelection.mode,
        sourceCategories: resolveSelectionCategories(queryPlan.sourceSelection),
        temporalMode: queryPlan.temporalSelection.mode,
        temporalOrder: resolveTemporalOrder(queryPlan.temporalSelection),
        requestedFields: queryPlan.requestedFields,
        requiredConcepts: queryPlan.requiredConcepts,
        missingSlots: queryPlan.missingSlots,
        clarificationQuestion: queryPlan.clarificationQuestion,
      },
    }
  }

  const failures: string[] = []
  const selectedEntityId =
    compiled.queryPlan.targetSelection.kind === 'candidate'
      ? compiled.queryPlan.targetSelection.entityId
      : null
  const sourceCategories = resolveSelectionCategories(
    compiled.queryPlan.sourceSelection,
  )
  const temporalOrder = resolveTemporalOrder(
    compiled.queryPlan.temporalSelection,
  )

  if (compiled.contextAction !== goldenCase.expectedContextAction) {
    failures.push('context_action')
  }
  if (selectedEntityId !== goldenCase.expectedEntityId) {
    failures.push('entity_id')
  }
  if (!goldenCase.expectedOperations.includes(compiled.queryPlan.operation)) {
    failures.push('operation')
  }
  if (
    compiled.queryPlan.sourceSelection.mode !== goldenCase.expectedSourceMode
  ) {
    failures.push('source_mode')
  }
  if (
    !goldenCase.expectedSourceCategories.every((sourceCategory) => {
      return compiled.retrievalPlan.sourceCategories.includes(sourceCategory)
    })
  ) {
    failures.push('source_categories')
  }
  if (
    compiled.queryPlan.temporalSelection.mode !==
    goldenCase.expectedTemporalMode
  ) {
    failures.push('temporal_mode')
  }
  if (temporalOrder !== goldenCase.expectedTemporalOrder) {
    failures.push('temporal_order')
  }
  if (
    !goldenCase.expectedAnyRequestedFields.some((requestedField) => {
      return compiled.queryPlan.requestedFields.includes(requestedField)
    })
  ) {
    failures.push('requested_fields')
  }
  if (
    (goldenCase.forbiddenRequestedFields ?? []).some((requestedField) => {
      return compiled.queryPlan.requestedFields.includes(requestedField)
    })
  ) {
    failures.push('forbidden_requested_fields')
  }
  if (
    !goldenCase.expectedRequiredConcepts.every((requiredConcept) => {
      return compiled.queryPlan.requiredConcepts.includes(requiredConcept)
    })
  ) {
    failures.push('required_concepts')
  }
  if (
    compiled.queryPlan.missingSlots.length > 0 !==
    goldenCase.expectClarification
  ) {
    failures.push('clarification')
  }
  if (
    compiled.retrievalPlan.executionKind !== goldenCase.expectedExecutionKind
  ) {
    failures.push('execution_kind')
  }

  return {
    id: goldenCase.id,
    passed: failures.length === 0,
    failures,
    actual: {
      contextAction: compiled.contextAction,
      entityId: selectedEntityId,
      operation: compiled.queryPlan.operation,
      sourceMode: compiled.queryPlan.sourceSelection.mode,
      sourceCategories,
      temporalMode: compiled.queryPlan.temporalSelection.mode,
      temporalOrder,
      requestedFields: compiled.queryPlan.requestedFields,
      requiredConcepts: compiled.queryPlan.requiredConcepts,
      missingSlots: compiled.queryPlan.missingSlots,
      clarificationQuestion: compiled.queryPlan.clarificationQuestion,
      executionKind: compiled.retrievalPlan.executionKind,
      targetSlug: compiled.retrievalPlan.canonicalTargets[0]?.slug ?? null,
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
  let lastActual: PlannerEvaluationActual | undefined

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

    const compiled = compileChatRetrievalPlan({
      queryPlan: plannerResult.queryPlan,
      candidates,
      previousState: state,
      maximumEvidenceCount: BLOG_CHAT.SEARCH.TOP_K,
    })

    if (!compiled.ok) {
      failures.push(`turn_${turnIndex + 1}_${compiled.failureKind}`)
      break
    }

    const targetSlug = compiled.retrievalPlan.canonicalTargets[0]?.slug ?? null
    const hasClarification =
      compiled.retrievalPlan.executionKind === 'clarification'

    if (compiled.contextAction !== turn.expectedContextAction) {
      failures.push(`turn_${turnIndex + 1}_context_action`)
    }
    if (targetSlug !== turn.expectedTargetSlug) {
      failures.push(`turn_${turnIndex + 1}_target`)
    }
    if (hasClarification !== turn.expectClarification) {
      failures.push(`turn_${turnIndex + 1}_clarification`)
    }

    state = compiled.nextConversationState
    history.push({
      question: turn.question,
      answer:
        compiled.queryPlan.clarificationQuestion ??
        '근거를 바탕으로 답변했습니다.',
      citations: [],
    })
    lastActual = {
      contextAction: compiled.contextAction,
      entityId:
        compiled.queryPlan.targetSelection.kind === 'candidate'
          ? compiled.queryPlan.targetSelection.entityId
          : null,
      operation: compiled.queryPlan.operation,
      sourceMode: compiled.queryPlan.sourceSelection.mode,
      sourceCategories: compiled.retrievalPlan.sourceCategories,
      temporalMode: compiled.queryPlan.temporalSelection.mode,
      temporalOrder: compiled.retrievalPlan.temporalOrder,
      requestedFields: compiled.queryPlan.requestedFields,
      requiredConcepts: compiled.queryPlan.requiredConcepts,
      missingSlots: compiled.queryPlan.missingSlots,
      clarificationQuestion: compiled.queryPlan.clarificationQuestion,
      executionKind: compiled.retrievalPlan.executionKind,
      targetSlug,
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
