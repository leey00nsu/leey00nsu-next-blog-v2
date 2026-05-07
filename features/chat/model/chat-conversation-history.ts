import type { ChatSourceCategory } from '@/features/chat/model/chat-evidence'

export interface ChatConversationHistoryItem {
  question: string
  answer: string
  citations: {
    title: string
    url: string
    sectionTitle: string | null
    sourceCategory: ChatSourceCategory
  }[]
}
