import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
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
  const progressEndReference = useRef<HTMLDivElement>(null)
  const shouldReduceMotion = Boolean(useReducedMotion())
  const visibleTrace =
    trace.stages.length > 0
      ? trace
      : reduceBlogChatProgressTrace(EMPTY_BLOG_CHAT_PROGRESS_TRACE, {
          type: 'stage',
          stage: 'understanding_question',
        })
  const latestStage = visibleTrace.stages.at(-1)?.stage

  useEffect(() => {
    const progressEndElement = progressEndReference.current

    if (typeof progressEndElement?.scrollIntoView !== 'function') {
      return
    }

    progressEndElement.scrollIntoView({
      behavior: shouldReduceMotion ? 'auto' : 'smooth',
      block: 'end',
      inline: 'nearest',
    })
  }, [
    latestStage,
    shouldReduceMotion,
    visibleTrace.sources.length,
    visibleTrace.stages.length,
  ])

  return (
    <div>
      <BlogChatProgress
        locale={locale}
        trace={visibleTrace}
        messages={messages}
        pending
      />
      <div ref={progressEndReference} aria-hidden="true" className="h-px" />
      <span className="sr-only">{children}</span>
    </div>
  )
}
