import { BLOG_CHAT } from '@/features/chat/config/constants'
import {
  evaluateChatIntentWithJev,
  isJevChatIntentEvaluationConfigured,
  type JevChatRoute,
  type JevChatRouteDecision,
} from '@/features/chat/api/evaluate-chat-intent-with-jev'
import { buildChatQuestionContextSnapshot } from '@/features/chat/lib/chat-question-context'
import type { ChatConversationHistoryItem } from '@/features/chat/model/chat-conversation-history'
import type { ChatConversationState } from '@/features/chat/model/chat-conversation-state'
import {
  ChatQueryPlanSchema,
  type ChatQueryOperation,
  type ChatQueryPlan,
} from '@/features/chat/model/chat-query-plan'
import type { SupportedLocale } from '@/shared/config/constants'

interface PlanChatIntentWithJevParams {
  question: string
  locale: SupportedLocale
  currentPostSlug?: string
  conversationState: ChatConversationState
  conversationHistory?: ChatConversationHistoryItem[]
}

const JEV_DIRECT_ROUTE_OPERATION_MAP: Record<
  Exclude<JevChatRoute, 'llm_planner'>,
  ChatQueryOperation
> = {
  social_reply: 'social_reply',
  identity: 'identity',
  owner_identity: 'owner_identity',
  public_contact: 'contact',
  private_contact: 'private_contact',
}

function buildDirectQueryPlan(params: {
  question: string
  decision: JevChatRouteDecision
}): ChatQueryPlan | null {
  if (
    params.decision.route === 'llm_planner' ||
    params.decision.confidence < BLOG_CHAT.JEV_ROUTER.MINIMUM_CONFIDENCE
  ) {
    return null
  }

  const operation = JEV_DIRECT_ROUTE_OPERATION_MAP[params.decision.route]

  return ChatQueryPlanSchema.parse({
    standaloneQuestion: params.question,
    contextAction: 'reset',
    targetSelection: { kind: 'none' },
    operation,
    sourceSelection: { mode: 'all' },
    temporalSelection: { mode: 'none' },
    requestedFields: operation === 'contact' ? ['contact_methods'] : [],
    requiredConcepts: [],
    optionalConcepts: [],
    missingSlots: [],
    clarificationQuestion: null,
    confidence:
      params.decision.confidence >= BLOG_CHAT.JEV_ROUTER.HIGH_CONFIDENCE
        ? 'high'
        : 'medium',
    reason: `Jev selected the ${params.decision.route} route.`,
  })
}

export function buildJevChatQueryPlan(params: {
  question: string
  decision: JevChatRouteDecision
}): ChatQueryPlan | null {
  return buildDirectQueryPlan(params)
}

export async function planChatIntentWithJev(
  params: PlanChatIntentWithJevParams,
): Promise<ChatQueryPlan | null> {
  if (!isJevChatIntentEvaluationConfigured()) {
    return null
  }

  try {
    const conversationContext = buildChatQuestionContextSnapshot({
      conversationHistory: params.conversationHistory,
      currentPostSlug: params.currentPostSlug,
    })
    const decision = await evaluateChatIntentWithJev({
      question: params.question,
      locale: params.locale,
      currentPostSlug: params.currentPostSlug,
      conversationState: params.conversationState,
      conversationContext,
    })

    return buildJevChatQueryPlan({
      question: params.question,
      decision,
    })
  } catch {
    return null
  }
}
