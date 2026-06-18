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
import {
  ChatIntentPatchSchema,
  type ChatIntentPatch,
} from '@/features/chat/model/chat-intent'
import type { SupportedLocale } from '@/shared/config/constants'

const CHAT_INTENT_PATCH_PLANNER = {
  MAXIMUM_ATTEMPT_COUNT: 2,
  SYSTEM: `You are an intent planner for a grounded, stateful blog chatbot.

Return only a structured patch describing how the current user message changes the validated conversation state. Do not answer the question.

Target update rules:
- preserve: keep the resolved target from conversationState
- replace: the user supplies or corrects a target
- clear: the message starts an independent topic that does not use the previous target

Meaning rules:
- Keep requestedFields explicit. Include published_at whenever the user asks for a posting time or date.
- Use latest or oldest temporal order based on meaning, not exact wording.
- Keep essential technologies, products, and named entities in requiredConcepts.
- Put ranking hints only in optionalConcepts.
- Add missingSlots only when execution is impossible without that information.
- If conversationState has pendingClarification and the user supplies the missing value, replace the target and return no repeated missing slot.
- Low confidence alone is not a reason to clarify.
- Use null clarificationQuestion when missingSlots is empty.`,
} as const

interface PlanChatIntentPatchParams {
  question: string
  locale: SupportedLocale
  conversationState: ChatConversationState
  conversationHistory?: ChatConversationHistoryItem[]
  currentPostSlug?: string
  assistantProfile?: ChatAssistantProfile | null
}

export interface PlanChatIntentPatchSuccessResult {
  ok: true
  intentPatch: ChatIntentPatch
}

export interface PlanChatIntentPatchFailureResult {
  ok: false
  refusalReason: 'missing_api_key' | 'model_error'
  failureKind: 'planner_unavailable' | 'invalid_intent_patch'
}

export type PlanChatIntentPatchResult =
  | PlanChatIntentPatchSuccessResult
  | PlanChatIntentPatchFailureResult

function trimQuestion(question: string): string {
  return question.slice(0, BLOG_CHAT.PLANNER.MAXIMUM_QUESTION_CHARACTERS)
}

export async function planChatIntentPatch(
  params: PlanChatIntentPatchParams,
): Promise<PlanChatIntentPatchResult> {
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
  let failureKind: PlanChatIntentPatchFailureResult['failureKind'] =
    'planner_unavailable'

  for (
    let attemptCount = 0;
    attemptCount < CHAT_INTENT_PATCH_PLANNER.MAXIMUM_ATTEMPT_COUNT;
    attemptCount += 1
  ) {
    try {
      const { output } = await generateText({
        model: openai(BLOG_CHAT.PLANNER.MODEL_ID),
        output: Output.object({
          schema: ChatIntentPatchSchema,
        }),
        system: CHAT_INTENT_PATCH_PLANNER.SYSTEM,
        prompt: [
          `locale=${params.locale}`,
          `assistantChatbotName=${params.assistantProfile?.chatbotName ?? ''}`,
          `assistantOwnerName=${params.assistantProfile?.ownerName ?? ''}`,
          `currentPostSlug=${params.currentPostSlug ?? ''}`,
          '<conversationState>',
          JSON.stringify(params.conversationState),
          '</conversationState>',
          buildPlannerConversationContextText(contextSnapshot),
          `question=${trimQuestion(params.question)}`,
        ].join('\n'),
      })
      const parsedIntentPatch = ChatIntentPatchSchema.safeParse(output)

      if (parsedIntentPatch.success) {
        return {
          ok: true,
          intentPatch: parsedIntentPatch.data,
        }
      }

      failureKind = 'invalid_intent_patch'
    } catch {
      failureKind = 'planner_unavailable'
    }
  }

  return {
    ok: false,
    refusalReason: 'model_error',
    failureKind,
  }
}
