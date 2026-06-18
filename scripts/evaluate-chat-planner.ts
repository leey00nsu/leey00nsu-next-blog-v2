import 'dotenv/config'
import { planChatIntent } from '@/features/chat/api/plan-chat-intent-patch'
import { CHAT_PLANNER_GOLDEN_CASES } from '@/features/chat/fixtures/chat-planner-evaluation'
import { matchChatEntityCandidates } from '@/features/chat/lib/match-chat-entity-candidates'
import { EMPTY_CHAT_CONVERSATION_STATE } from '@/features/chat/model/chat-conversation-state'
import type { ChatConversationState } from '@/features/chat/model/chat-conversation-state'
import type { ChatConversationHistoryItem } from '@/features/chat/model/chat-conversation-history'
import { getChatEntityCandidates } from '@/features/chat/model/get-chat-entity-candidates'
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
    requiredConcepts: string[]
    missingSlots: string[]
    clarificationQuestion: string | null
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
  if (
    !goldenCase.expectedRequiredConcepts.every((requiredConcept) => {
      return normalized.intent.requiredConcepts.includes(requiredConcept)
    })
  ) {
    failures.push('required_concepts')
  }
  if (
    (normalized.intent.missingSlots.length > 0) !==
    goldenCase.expectClarification
  ) {
    failures.push('clarification')
  }

  return {
    id: goldenCase.id,
    passed: failures.length === 0,
    failures,
    actual: {
      contextAction: normalized.contextAction,
      entityId: selectedEntityId,
      evidenceScope: normalized.intent.evidenceScope,
      requiredConcepts: normalized.intent.requiredConcepts,
      missingSlots: normalized.intent.missingSlots,
      clarificationQuestion: normalized.intent.clarificationQuestion,
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
    ...(await Promise.all(CHAT_PLANNER_GOLDEN_CASES.map(evaluatePlannerCase))),
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
      error: error instanceof Error ? error.message : 'planner_evaluation_error',
    }),
  )
  process.exitCode = 1
})
