import 'dotenv/config'
import { planChatIntent } from '@/features/chat/api/plan-chat-intent-patch'
import { CHAT_PLANNER_GOLDEN_CASES } from '@/features/chat/fixtures/chat-planner-evaluation'
import { matchChatEntityCandidates } from '@/features/chat/lib/match-chat-entity-candidates'
import { EMPTY_CHAT_CONVERSATION_STATE } from '@/features/chat/model/chat-conversation-state'
import { getChatEntityCandidates } from '@/features/chat/model/get-chat-entity-candidates'
import { normalizeChatIntentPlan } from '@/features/chat/model/normalize-chat-intent-plan'

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

async function main(): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('missing_api_key')
  }

  const results = await Promise.all(
    CHAT_PLANNER_GOLDEN_CASES.map(evaluatePlannerCase),
  )
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
