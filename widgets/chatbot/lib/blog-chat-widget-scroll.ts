import type { BlogChatConversationItem } from '@/features/chat/model/use-blog-chat'

interface ShouldScrollBlogChatToLatestConversationItemParams {
  previousConversationItems: BlogChatConversationItem[]
  nextConversationItems: BlogChatConversationItem[]
}

export function shouldScrollBlogChatToLatestConversationItem({
  previousConversationItems,
  nextConversationItems,
}: ShouldScrollBlogChatToLatestConversationItemParams): boolean {
  if (nextConversationItems.length > previousConversationItems.length) {
    return true
  }

  const previousLatestConversationItem = previousConversationItems.at(-1)
  const nextLatestConversationItem = nextConversationItems.at(-1)

  if (!previousLatestConversationItem || !nextLatestConversationItem) {
    return false
  }

  if (previousLatestConversationItem.id !== nextLatestConversationItem.id) {
    return true
  }

  if (
    previousLatestConversationItem.status !== nextLatestConversationItem.status
  ) {
    return true
  }

  if (
    previousLatestConversationItem.status === 'completed' &&
    nextLatestConversationItem.status === 'completed'
  ) {
    if (
      previousLatestConversationItem.response.answer !==
      nextLatestConversationItem.response.answer
    ) {
      return true
    }

    if (
      previousLatestConversationItem.response.citations.length !==
      nextLatestConversationItem.response.citations.length
    ) {
      return true
    }
  }

  if (
    previousLatestConversationItem.status === 'failed' &&
    nextLatestConversationItem.status === 'failed'
  ) {
    return (
      previousLatestConversationItem.errorCode !==
      nextLatestConversationItem.errorCode
    )
  }

  return false
}
