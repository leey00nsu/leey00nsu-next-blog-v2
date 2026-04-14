import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import type { ChatAssistantProfile } from '@/features/chat/model/chat-assistant'
import { BLOG_CHAT } from '@/features/chat/config/constants'
import {
  ChatQuestionPlanSchema,
  type ChatQuestionPlanResult,
} from '@/features/chat/model/chat-question-plan'
import {
  buildChatQuestionContextSnapshot,
  buildPlannerConversationContextText,
} from '@/features/chat/lib/chat-question-context'
import type { ChatConversationHistoryItem } from '@/features/chat/lib/rewrite-chat-question'
import type { SupportedLocale } from '@/shared/config/constants'

const CHAT_QUESTION_PLANNER_PROMPT = {
  SYSTEM: `You are a planner for a grounded blog chatbot.

Return a structured plan, not the final answer.

Fields:
- standaloneQuestion: rewrite the user question into a standalone question that keeps the real intent
- socialPreamble: true if the question starts with a greeting or social preamble
- action: answer | summarize | explain | recommend | compare
- scope: global | current_page
- deterministicAction: none | social_reply | contact | latest_post | oldest_post
- needsRetrieval: whether evidence retrieval should run
- retrievalMode: none | standard | corpus | current_post
- preferredSourceCategories: blog | profile | project | assistant
- additionalKeywords: short retrieval hints or entity terms
- needsClarification: true if the user reference is ambiguous and should be clarified
- clarificationQuestion: short follow-up question when clarification is required
- reason: one short sentence

Rules:
- If there is any substantive question after a greeting, do not use social_reply.
- Use deterministicAction only when a direct response is clearly enough.
- Use current_post only when the user is clearly referring to the current page.
- Use corpus when the user asks about patterns or themes across multiple posts or the whole blog.
- If a pronoun or reference target is ambiguous, prefer clarification over guessing.
- Keep clarificationQuestion null unless needsClarification is true.`,
} as const

interface PlanChatQuestionParams {
  question: string
  locale: SupportedLocale
  conversationHistory?: ChatConversationHistoryItem[]
  currentPostSlug?: string
  assistantProfile?: ChatAssistantProfile | null
}

function trimQuestion(question: string): string {
  return question.slice(0, BLOG_CHAT.PLANNER.MAXIMUM_QUESTION_CHARACTERS)
}

export async function planChatQuestion(
  params: PlanChatQuestionParams,
): Promise<ChatQuestionPlanResult> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      ok: false,
      refusalReason: 'missing_api_key',
    }
  }

  try {
    const contextSnapshot = buildChatQuestionContextSnapshot({
      conversationHistory: params.conversationHistory,
      currentPostSlug: params.currentPostSlug,
    })
    const { output } = await generateText({
      model: openai(BLOG_CHAT.PLANNER.MODEL_ID),
      temperature: 0,
      output: Output.object({
        schema: ChatQuestionPlanSchema,
      }),
      system: CHAT_QUESTION_PLANNER_PROMPT.SYSTEM,
      prompt: [
        `locale=${params.locale}`,
        `assistantChatbotName=${params.assistantProfile?.chatbotName ?? ''}`,
        `assistantOwnerName=${params.assistantProfile?.ownerName ?? ''}`,
        buildPlannerConversationContextText(contextSnapshot),
        `question=${trimQuestion(params.question)}`,
      ].join('\n'),
    })

    return {
      ok: true,
      questionPlan: ChatQuestionPlanSchema.parse(output),
    }
  } catch {
    return {
      ok: false,
      refusalReason: 'model_error',
    }
  }
}
