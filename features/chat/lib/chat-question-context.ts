import type { ChatSourceCategory } from '@/features/chat/model/chat-evidence'
import type { ChatConversationHistoryItem } from '@/features/chat/model/chat-conversation-history'

interface BuildChatQuestionContextSnapshotParams {
  conversationHistory?: ChatConversationHistoryItem[]
  currentPostSlug?: string
}

export interface ChatQuestionContextSnapshot {
  latestConversationQuestion: string | null
  latestCitationTitles: string[]
  latestCitationSourceCategories: ChatSourceCategory[]
  recentConversationTurns: ChatConversationHistoryItem[]
  hasCurrentPostContext: boolean
}

const CHAT_QUESTION_CONTEXT = {
  MAXIMUM_CONTEXT_CITATION_COUNT: 3,
  MAXIMUM_CONTEXT_ANSWER_CHARACTERS: 240,
} as const

function trimContextAnswer(answer: string): string {
  return answer.slice(0, CHAT_QUESTION_CONTEXT.MAXIMUM_CONTEXT_ANSWER_CHARACTERS)
}

function buildPlannerConversationTurnText(
  conversationHistoryItem: ChatConversationHistoryItem,
  turnIndex: number,
): string {
  const citationTitles = conversationHistoryItem.citations.map((citation) => {
    return citation.title
  })
  const citationSourceCategories = conversationHistoryItem.citations.map(
    (citation) => {
      return citation.sourceCategory
    },
  )
  const citationUrls = conversationHistoryItem.citations.map((citation) => {
    return citation.url
  })

  return [
    `<turn index="${turnIndex + 1}">`,
    `userQuestion=${conversationHistoryItem.question}`,
    `assistantAnswer=${trimContextAnswer(conversationHistoryItem.answer)}`,
    `citationTitles=${citationTitles.join(', ')}`,
    `citationSourceCategories=${citationSourceCategories.join(', ')}`,
    `citationUrls=${citationUrls.join(', ')}`,
    '</turn>',
  ].join('\n')
}

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
    recentConversationTurns: conversationHistory,
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
    `recentConversationTurns=${contextSnapshot.recentConversationTurns
      .map((conversationHistoryItem, turnIndex) => {
        return buildPlannerConversationTurnText(
          conversationHistoryItem,
          turnIndex,
        )
      })
      .join('\n')}`,
    `hasCurrentPostContext=${String(contextSnapshot.hasCurrentPostContext)}`,
  ].join('\n')
}
