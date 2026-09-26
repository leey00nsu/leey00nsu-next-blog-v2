import type { ChatObservabilityLogRecord } from '@/features/chat/model/chat-observability'

type ChatLogMatch = ChatObservabilityLogRecord['finalMatches'][number]

export function isPublicChatLogMatchUrl(match: ChatLogMatch): boolean {
  if (match.sourceCategory === 'assistant') {
    return false
  }

  if (match.url.startsWith('/') && !match.url.startsWith('//')) {
    return true
  }

  try {
    const parsedUrl = new URL(match.url)

    return parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:'
  } catch {
    return false
  }
}
