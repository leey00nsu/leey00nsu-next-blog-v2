import type { ChatSourceCategory } from '@/features/chat/model/chat-evidence'
import type { ChatConversationHistoryItem } from '@/features/chat/lib/rewrite-chat-question'

interface BuildChatQuestionContextSnapshotParams {
  conversationHistory?: ChatConversationHistoryItem[]
  currentPostSlug?: string
}

export interface ChatQuestionContextSnapshot {
  latestConversationQuestion: string | null
  latestCitationTitles: string[]
  latestCitationSourceCategories: ChatSourceCategory[]
  hasCurrentPostContext: boolean
}

const CHAT_QUESTION_CONTEXT = {
  MAXIMUM_CONTEXT_CITATION_COUNT: 3,
} as const

export function buildChatQuestionContextSnapshot({
  conversationHistory = [],
  currentPostSlug,
}: BuildChatQuestionContextSnapshotParams): ChatQuestionContextSnapshot {
  const latestConversationHistory = conversationHistory.at(-1)

  return {
    latestConversationQuestion: latestConversationHistory?.question ?? null,
    latestCitationTitles:
      latestConversationHistory?.citations
        .slice(0, CHAT_QUESTION_CONTEXT.MAXIMUM_CONTEXT_CITATION_COUNT)
        .map((citation) => citation.title) ?? [],
    latestCitationSourceCategories:
      latestConversationHistory?.citations
        .slice(0, CHAT_QUESTION_CONTEXT.MAXIMUM_CONTEXT_CITATION_COUNT)
        .map((citation) => citation.sourceCategory) ?? [],
    hasCurrentPostContext: Boolean(currentPostSlug),
  }
}

export function buildPlannerConversationContextText(
  contextSnapshot: ChatQuestionContextSnapshot,
): string {
  return [
    `latestQuestion=${contextSnapshot.latestConversationQuestion ?? ''}`,
    `latestCitationTitles=${contextSnapshot.latestCitationTitles.join(', ')}`,
    `latestCitationSourceCategories=${contextSnapshot.latestCitationSourceCategories.join(', ')}`,
    `hasCurrentPostContext=${String(contextSnapshot.hasCurrentPostContext)}`,
  ].join('\n')
}
