import { openai } from '@ai-sdk/openai'
import { generateText, Output } from 'ai'
import { BLOG_CHAT } from '@/features/chat/config/constants'
import {
  buildChatQuestionContextSnapshot,
  buildPlannerConversationContextText,
} from '@/features/chat/lib/chat-question-context'
import type { ChatAssistantProfile } from '@/features/chat/model/chat-assistant'
import type { ChatConversationHistoryItem } from '@/features/chat/model/chat-conversation-history'
import type { ChatConversationState } from '@/features/chat/model/chat-conversation-state'
import type { ChatEntityCandidate } from '@/features/chat/model/chat-entity-candidate'
import {
  ChatIntentPlanSchema,
  type ChatIntentPlan,
} from '@/features/chat/model/chat-intent'
import type { SupportedLocale } from '@/shared/config/constants'

const CHAT_INTENT_PLANNER = {
  MAXIMUM_ATTEMPT_COUNT: 2,
  SYSTEM: `You are an intent planner for a grounded, stateful blog chatbot.

Return only a structured intent plan. Do not answer the question.

Context action rules:
- continue: the message follows the current focused target.
- reset: the message starts an independent topic. A new named topic is reset + candidate.
- resolve_clarification: only when the message answers the pending clarification.

Target rules:
- candidate: select only an entityId supplied in entityCandidates.
- preserve: keep the focused target only for a contextual follow-up.
- none: no canonical target is needed.
- Never invent a target or entityId.

Meaning rules:
- A specific project or named entity uses entity scope.
- A question aggregating recent or multiple projects uses corpus scope.
- Unknown non-pronoun terms should search corpus before clarification.
- Keep requestedFields explicit. Include published_at for posting time or date.
- Keep essential technologies and products in requiredConcepts.
- Add missingSlots only when execution is impossible without the information.
- Low confidence alone is not a reason to clarify.
- clarificationQuestion is null exactly when missingSlots is empty.`,
} as const

interface PlanChatIntentParams {
  question: string
  locale: SupportedLocale
  conversationState: ChatConversationState
  entityCandidates: ChatEntityCandidate[]
  conversationHistory?: ChatConversationHistoryItem[]
  currentPostSlug?: string
  assistantProfile?: ChatAssistantProfile | null
}

export interface PlanChatIntentSuccessResult {
  ok: true
  intentPlan: ChatIntentPlan
}

export interface PlanChatIntentFailureResult {
  ok: false
  refusalReason: 'missing_api_key' | 'model_error'
  failureKind: 'planner_unavailable' | 'invalid_intent_plan'
}

export type PlanChatIntentResult =
  | PlanChatIntentSuccessResult
  | PlanChatIntentFailureResult

function trimQuestion(question: string): string {
  return question.slice(0, BLOG_CHAT.PLANNER.MAXIMUM_QUESTION_CHARACTERS)
}

export async function planChatIntent(
  params: PlanChatIntentParams,
): Promise<PlanChatIntentResult> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      ok: false,
      refusalReason: 'missing_api_key',
      failureKind: 'planner_unavailable',
    }
  }

  const contextSnapshot = buildChatQuestionContextSnapshot({
    conversationHistory: params.conversationHistory,
    currentPostSlug: params.currentPostSlug,
  })
  let failureKind: PlanChatIntentFailureResult['failureKind'] =
    'planner_unavailable'
  let validationFailure = ''

  for (
    let attemptCount = 0;
    attemptCount < CHAT_INTENT_PLANNER.MAXIMUM_ATTEMPT_COUNT;
    attemptCount += 1
  ) {
    try {
      const { output } = await generateText({
        model: openai(BLOG_CHAT.PLANNER.MODEL_ID),
        output: Output.object({ schema: ChatIntentPlanSchema }),
        system: CHAT_INTENT_PLANNER.SYSTEM,
        prompt: [
          `locale=${params.locale}`,
          `assistantChatbotName=${params.assistantProfile?.chatbotName ?? ''}`,
          `assistantOwnerName=${params.assistantProfile?.ownerName ?? ''}`,
          `currentPostSlug=${params.currentPostSlug ?? ''}`,
          '<conversationState>',
          JSON.stringify(params.conversationState),
          '</conversationState>',
          '<entityCandidates>',
          JSON.stringify(params.entityCandidates),
          '</entityCandidates>',
          validationFailure
            ? `previousValidationFailure=${validationFailure}`
            : '',
          buildPlannerConversationContextText(contextSnapshot),
          `question=${trimQuestion(params.question)}`,
        ].join('\n'),
      })
      const parsedIntentPlan = ChatIntentPlanSchema.safeParse(output)

      if (parsedIntentPlan.success) {
        return { ok: true, intentPlan: parsedIntentPlan.data }
      }

      failureKind = 'invalid_intent_plan'
      validationFailure = parsedIntentPlan.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ')
    } catch {
      failureKind = 'planner_unavailable'
    }
  }

  return { ok: false, refusalReason: 'model_error', failureKind }
}
