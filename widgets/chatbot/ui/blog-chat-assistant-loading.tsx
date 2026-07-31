import {
  EMPTY_BLOG_CHAT_PROGRESS_TRACE,
  reduceBlogChatProgressTrace,
  type BlogChatProgressTrace,
} from '@/features/chat/model/blog-chat-progress'
import type { SupportedLocale } from '@/shared/config/constants'
import {
  BlogChatProgress,
  type BlogChatProgressMessages,
} from '@/widgets/chatbot/ui/blog-chat-progress'

interface BlogChatAssistantLoadingProps {
  children: string
  locale: SupportedLocale
  trace: BlogChatProgressTrace
  messages: BlogChatProgressMessages
}

export function BlogChatAssistantLoading({
  children,
  locale,
  trace,
  messages,
}: BlogChatAssistantLoadingProps) {
  const visibleTrace =
    trace.stages.length > 0
      ? trace
      : reduceBlogChatProgressTrace(EMPTY_BLOG_CHAT_PROGRESS_TRACE, {
          type: 'stage',
          stage: 'understanding_question',
        })

  return (
    <div>
      <BlogChatProgress
        locale={locale}
        trace={visibleTrace}
        messages={messages}
        pending
      />
      <span className="sr-only">{children}</span>
    </div>
  )
}
