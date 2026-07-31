import type { ChatSourceCategory } from '@/features/chat/model/chat-evidence'
import type { BlogChatResponse } from '@/features/chat/model/chat-schema'

export interface ChatConversationHistoryItem {
  question: string
  answer: string
  refusalReason?: BlogChatResponse['refusalReason']
  citations: {
    title: string
    url: string
    sectionTitle: string | null
    sourceCategory: ChatSourceCategory
  }[]
}
