import { TypeSafeClient } from '@typesafe-ai/sdk'
import { BLOG_CHAT } from '@/features/chat/config/constants'
import type { ChatQuestionContextSnapshot } from '@/features/chat/lib/chat-question-context'
import type { ChatConversationState } from '@/features/chat/model/chat-conversation-state'
import type { SupportedLocale } from '@/shared/config/constants'

export const JEV_CHAT_ROUTES = [
  'social_reply',
  'identity',
  'owner_identity',
  'public_contact',
  'private_contact',
  'llm_planner',
] as const

export type JevChatRoute = (typeof JEV_CHAT_ROUTES)[number]

interface EvaluateChatIntentWithJevParams {
  question: string
  locale: SupportedLocale
  currentPostSlug?: string
  conversationState: ChatConversationState
  conversationContext: ChatQuestionContextSnapshot
}

export interface JevChatRouteDecision {
  route: JevChatRoute
  confidence: number
}

export function isJevChatIntentEvaluationConfigured(): boolean {
  return Boolean(process.env.TYPESAFE_API_KEY || process.env.AI_GATEWAY_API_KEY)
}

function getTypeSafeApiKey(): string {
  const apiKey = process.env.TYPESAFE_API_KEY ?? process.env.AI_GATEWAY_API_KEY

  if (!apiKey) {
    throw new Error('TYPESAFE_API_KEY is required to evaluate chat intent.')
  }

  return apiKey
}

export async function evaluateChatIntentWithJev(
  params: EvaluateChatIntentWithJevParams,
): Promise<JevChatRouteDecision> {
  const typeSafeClient = new TypeSafeClient({
    apiKey: getTypeSafeApiKey(),
    defaultModel: BLOG_CHAT.JEV_ROUTER.MODEL_ID,
    timeout: BLOG_CHAT.JEV_ROUTER.MODEL_TIMEOUT_MILLISECONDS,
  })
  const result = await typeSafeClient.systemOne(
    {
      model: BLOG_CHAT.JEV_ROUTER.MODEL_ID,
      state: {
        locale: params.locale,
        question: params.question,
        currentPostSlug: params.currentPostSlug ?? null,
        conversationState: params.conversationState,
        conversationContext: {
          latestConversationQuestion:
            params.conversationContext.latestConversationQuestion,
          latestCitationTitles: [
            ...params.conversationContext.latestCitationTitles,
          ],
          latestCitationSourceCategories: [
            ...params.conversationContext.latestCitationSourceCategories,
          ],
          recentConversationTurns:
            params.conversationContext.recentConversationTurns.map(
              (conversationTurn) => ({
                question: conversationTurn.question,
                answer: conversationTurn.answer,
                refusalReason: conversationTurn.refusalReason ?? null,
                citations: conversationTurn.citations.map((citation) => ({
                  title: citation.title,
                  url: citation.url,
                  sectionTitle: citation.sectionTitle,
                  sourceCategory: citation.sourceCategory,
                })),
              }),
            ),
          hasCurrentPostContext:
            params.conversationContext.hasCurrentPostContext,
        },
      },
      questions: {
        route: {
          type: 'choice',
          instructions:
            'Choose the one handler that can safely process the current user message. Use conversation context only to resolve references. Choose llm_planner for every request that needs evidence retrieval, conversation planning, clarification, comparison, recommendation, explanation, or generated content.',
          criteria: {
            social_reply:
              'Only a greeting, thanks, farewell, or casual small talk that needs no factual evidence.',
            identity:
              'Only asks the chatbot name, identity, or relationship to the blog owner. Capabilities, behavior, implementation, structure, or how it works require llm_planner.',
            owner_identity:
              'Only asks the name or identity of the blog owner or author.',
            public_contact:
              'Asks for an intentionally public contact channel such as GitHub, LinkedIn, public email, or portfolio contact information.',
            private_contact:
              'Asks for private personal contact or location information such as a phone number, mobile number, home address, residence, or where the owner lives.',
            llm_planner:
              'Every other request, including factual lookup, latest workplace, blog or project questions, chatbot workings, contextual follow-ups, clarification answers, ambiguous references, comparisons, recommendations, and compound requests.',
          },
        },
      },
    },
    {
      timeout: BLOG_CHAT.JEV_ROUTER.MODEL_TIMEOUT_MILLISECONDS,
      retry: { maxRetries: 0 },
    },
  )

  return {
    route: result.answers.route.choice,
    confidence: result.answers.route.confidence,
  }
}
