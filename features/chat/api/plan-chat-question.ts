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
import type { ChatConversationHistoryItem } from '@/features/chat/model/chat-conversation-history'
import type { SupportedLocale } from '@/shared/config/constants'

const CHAT_QUESTION_PLANNER_PROMPT = {
  SYSTEM: `You are a planner for a grounded blog chatbot.

Return a structured plan, not the final answer.

Fields:
- standaloneQuestion: rewrite the user question into a standalone question that keeps the real intent
- action: answer | summarize | explain | recommend | compare
- route: direct | clarify | retrieve
- directAction: none | social_reply | contact | latest_post | oldest_post
- retrievalScope: none | current_source | entity | corpus
- referenceTarget: the source or entity the user is referring to
- preferredSourceCategories: blog | profile | project | assistant
- additionalKeywords: short retrieval hints or entity terms
- clarificationQuestion: short follow-up question when clarification is required
- reason: one short sentence

Rules:
- If there is any substantive question after a greeting, do not use social_reply.
- Use route=direct only when a fixed server response is clearly enough.
- Use route=clarify when a pronoun or reference target is ambiguous.
- Use route=retrieve when evidence is needed.
- Use retrievalScope=current_source when the user clearly refers to the current page, this post, this project, here, or equivalent.
- Use retrievalScope=entity when the user asks about a specific person, project, assistant, or named item.
- Use retrievalScope=corpus when the user asks about patterns or themes across multiple posts/projects or the whole blog.
- Keep directAction=none unless route=direct.
- Keep clarificationQuestion null unless route=clarify.
- For referenceTarget, use null for sourceCategory, slug, and title when kind=none.`,
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
