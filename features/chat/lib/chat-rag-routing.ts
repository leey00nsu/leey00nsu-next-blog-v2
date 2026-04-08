import type { ChatQuestionType } from '@/features/chat/lib/question-analysis'
import { CHAT_RAG } from '@/features/chat/config/chat-rag'

export const CHAT_RAG_HANDLING_MODES = [
  'deterministic',
  'rag',
] as const

export type ChatRagHandlingMode = (typeof CHAT_RAG_HANDLING_MODES)[number]

interface SelectChatRagHandlingModeParams {
  normalizedQuestion: string
  questionType: ChatQuestionType
}

export function selectChatRagHandlingMode({
  normalizedQuestion,
  questionType,
}: SelectChatRagHandlingModeParams): ChatRagHandlingMode {
  if (
    questionType === 'greeting' ||
    questionType === 'assistant-identity'
  ) {
    return 'deterministic'
  }

  const isDeterministicQuestion =
    CHAT_RAG.ROUTING.DETERMINISTIC_QUERY_PATTERNS.some((pattern) => {
      return normalizedQuestion.includes(pattern)
    })

  return isDeterministicQuestion ? 'deterministic' : 'rag'
}
