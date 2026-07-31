import { openai } from '@ai-sdk/openai'
import { generateText, Output } from 'ai'
import { BLOG_CHAT } from '@/features/chat/config/constants'
import { getBlogChatPlannerModel } from '@/features/chat/config/chat-models'
import {
  buildChatQuestionContextSnapshot,
  buildPlannerConversationContextText,
} from '@/features/chat/lib/chat-question-context'
import type { ChatAssistantProfile } from '@/features/chat/model/chat-assistant'
import type { ChatConversationHistoryItem } from '@/features/chat/model/chat-conversation-history'
import type { ChatConversationState } from '@/features/chat/model/chat-conversation-state'
import type { ChatEntityCandidate } from '@/features/chat/model/chat-entity-candidate'
import {
  ChatQueryPlanSchema,
  type ChatQueryPlan,
} from '@/features/chat/model/chat-query-plan'
import type { SupportedLocale } from '@/shared/config/constants'

const CHAT_INTENT_PLANNER = {
  MAXIMUM_ATTEMPT_COUNT: 2,
  SYSTEM: `You are an intent planner for a grounded, stateful blog chatbot.

Return only a structured intent plan. Do not answer the question.

Context action rules:
- continue: the message follows the current focused target.
- reset: the message starts an independent topic. A new named topic is reset + candidate.
- resolve_clarification: only when the message answers the pending clarification.
- When pendingClarification exists and the message supplies its missing target, use resolve_clarification, never reset.
- Elliptical follow-ups such as "why did they stop?" preserve an existing focused target and do not add a missing target slot.

Target rules:
- candidate: select only an entityId supplied in entityCandidates.
- preserve: keep the focused target only for a contextual follow-up.
- none: no canonical target is needed.
- Never invent a target or entityId.

Source rules:
- only: the question explicitly limits evidence to listed source categories.
- prefer: listed categories are preferred, but cross-category evidence is allowed.
- all: no source category restriction is expressed.
- Explicit words such as project/프로젝트 or post/blog/글/블로그 limit the source with only.
- A selected candidate uses only that candidate's sourceCategory unless the question explicitly compares or combines source categories.
- Example: "recent projects using AI" is only project, not all.
- Example: "recent uses of AI" without a source noun is all.
- Use current_source only when the question explicitly refers to the current page.
- Do not infer source categories from target names not supplied in entityCandidates.

Temporal rules:
- single: the user asks for one newest or oldest item.
- rank: recency or age should influence evidence ranking for an explanatory, summary, comparison, or recommendation answer.
- none: time is not part of the request.

Meaning rules:
- Unknown non-pronoun terms should search corpus before clarification.
- A pronoun such as "이 사람" or "this person" with no focused target and no matching entity candidate requires the target missingSlot and a clarification question. Do not silently assume the blog owner.
- Category-wide or aggregate questions such as "recent projects using AI" need no individual target and must not add a target missingSlot.
- Use explain for how/why questions that synthesize content. Use lookup only for direct fact or metadata retrieval.
- Keep requestedFields explicit. Include published_at for posting time or date.
- Even when missingSlots requires clarification, preserve the suspended question's requestedFields and concepts.
- Recency words used only for rank/single do not request published_at. Include published_at only when the user explicitly asks for a date or posting time.
- Keep essential technologies and products in requiredConcepts.
- Do not repeat a selected canonical target name in requiredConcepts; the target filter already enforces it.
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
  queryPlan: ChatQueryPlan
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
        model: openai(getBlogChatPlannerModel()),
        output: Output.object({ schema: ChatQueryPlanSchema }),
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
      const parsedQueryPlan = ChatQueryPlanSchema.safeParse(output)

      if (parsedQueryPlan.success) {
        return { ok: true, queryPlan: parsedQueryPlan.data }
      }

      failureKind = 'invalid_intent_plan'
      validationFailure = parsedQueryPlan.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ')
    } catch {
      failureKind = 'planner_unavailable'
    }
  }

  return { ok: false, refusalReason: 'model_error', failureKind }
}
