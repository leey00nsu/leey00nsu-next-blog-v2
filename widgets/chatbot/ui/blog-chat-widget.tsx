'use client'

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  LEE_CHAT_TEXT_PRESETS,
  LeeChatProvider,
  LeeChatWidget,
} from 'lee-chat-sdk'
import { ArrowUpRight, MessageCircleMore } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import { createBlogChatProgressFetch } from '@/features/chat/api/create-blog-chat-progress-fetch'
import {
  EMPTY_BLOG_CHAT_PROGRESS_TRACE,
  reduceBlogChatProgressTrace,
  type BlogChatProgressEvent,
  type BlogChatProgressTrace,
} from '@/features/chat/model/blog-chat-progress'
import type { BlogChatResponse } from '@/features/chat/model/chat-schema'
import type { ChatConversationState } from '@/features/chat/model/chat-conversation-state'
import type { SupportedLocale } from '@/shared/config/constants'
import { ROUTES } from '@/shared/config/constants'
import { BlogChatAssistantLoading } from '@/widgets/chatbot/ui/blog-chat-assistant-loading'
import {
  BlogChatProgress,
  type BlogChatProgressMessages,
} from '@/widgets/chatbot/ui/blog-chat-progress'
import { BlogChatSubmitContent } from '@/widgets/chatbot/ui/blog-chat-submit-content'

const BLOG_CHAT_WIDGET_PATH = {
  VISIBLE_PATH_PATTERN: /^\/(ko|en)\/(blog|about)(\/|$)/,
  BLOG_DETAIL_PATH_PATTERN: /^\/(ko|en)\/blog\/([^/?#]+)$/,
} as const
const BLOG_CHAT_SDK = {
  APP_ID: 'leey00nsu-next-blog',
  CONVERSATION_ID_PREFIX: 'blog-chat',
  THEME_PRIMARY_COLOR: '#18181b',
  THEME_RADIUS: '0.5rem',
} as const

function resolveCurrentPostSlug(pathname: string): string | undefined {
  const matchedPath = pathname.match(BLOG_CHAT_WIDGET_PATH.BLOG_DETAIL_PATH_PATTERN)

  return matchedPath?.[2]
}

interface BlogChatWidgetViewProps {
  locale: SupportedLocale
  currentPostSlug?: string
  translate: (
    key: string,
    values?: Record<string, string | number>,
  ) => string
}

interface BlogChatMessageMetadata {
  blogChatResponse?: BlogChatResponse
  conversationState?: ChatConversationState
  blogChatProgressTrace?: BlogChatProgressTrace
}

export function BlogChatWidget() {
  const locale = useLocale() as SupportedLocale
  const pathname = usePathname()
  const t = useTranslations('chatbot')
  const currentPostSlug = resolveCurrentPostSlug(pathname)

  if (!BLOG_CHAT_WIDGET_PATH.VISIBLE_PATH_PATTERN.test(pathname)) {
    return null
  }

  return (
    <BlogChatWidgetView
      locale={locale}
      currentPostSlug={currentPostSlug}
      translate={t}
    />
  )
}

export function BlogChatWidgetView({
  locale,
  currentPostSlug,
  translate,
}: BlogChatWidgetViewProps) {
  const t = translate
  const [progressTrace, setProgressTrace] = useState<BlogChatProgressTrace>(
    EMPTY_BLOG_CHAT_PROGRESS_TRACE,
  )
  const progressMessages: BlogChatProgressMessages = {
    title: t('progress.title'),
    completedTitle: t('progress.completedTitle'),
    sourceCount: (sourceCount) => {
      return t('progress.sourceCount', { count: sourceCount })
    },
    stages: {
      understanding_question: t('progress.stages.understandingQuestion'),
      checking_sources: t('progress.stages.checkingSources'),
      searching_evidence: t('progress.stages.searchingEvidence'),
      selecting_evidence: t('progress.stages.selectingEvidence'),
      generating_answer: t('progress.stages.generatingAnswer'),
      validating_answer: t('progress.stages.validatingAnswer'),
    },
  }
  const handleRequestStart = useCallback(() => {
    setProgressTrace(
      reduceBlogChatProgressTrace(EMPTY_BLOG_CHAT_PROGRESS_TRACE, {
        type: 'stage',
        stage: 'understanding_question',
      }),
    )
  }, [])
  const handleProgress = useCallback((event: BlogChatProgressEvent) => {
    setProgressTrace((currentTrace) => {
      return reduceBlogChatProgressTrace(currentTrace, event)
    })
  }, [])
  const progressFetchImplementation = useMemo(() => {
    return createBlogChatProgressFetch({
      onRequestStart: handleRequestStart,
      onProgress: handleProgress,
    })
  }, [handleProgress, handleRequestStart])

  return (
    <LeeChatProvider<BlogChatMessageMetadata>
      config={{
        appId: BLOG_CHAT_SDK.APP_ID,
        endpoint: ROUTES.API.CHAT,
        conversation: {
          id: `${BLOG_CHAT_SDK.CONVERSATION_ID_PREFIX}:${locale}`,
          kind: 'assistant',
          metadata: {
            locale,
            currentPostSlug,
          },
        },
        metadata: {
          locale,
          currentPostSlug,
        },
        initialMessage: t('emptyTitle'),
        persistence: 'localStorage',
        position: 'bottom-right',
        features: {
          attachments: false,
          realtime: false,
          operatorConsole: false,
        },
        messageStatus: {
          showSending: false,
        },
        texts: {
          ...LEE_CHAT_TEXT_PRESETS[locale],
          title: t('title'),
          subtitle: t('subtitle'),
          triggerLabel: t('trigger'),
          placeholder: t('inputPlaceholder'),
          send: t('send'),
          sending: t('sending'),
          messageSending: t('sending'),
          assistantLoading: t('sending'),
          error: t('errors.request_failed'),
          retry: t('send'),
        },
        theme: {
          primaryColor: BLOG_CHAT_SDK.THEME_PRIMARY_COLOR,
          radius: BLOG_CHAT_SDK.THEME_RADIUS,
        },
        className: {
          root: 'z-[60]',
        },
      }}
      fetchImplementation={progressFetchImplementation}
    >
      <LeeChatWidget<BlogChatMessageMetadata>
        renderAssistantLoading={() => {
          return (
            <BlogChatAssistantLoading
              locale={locale}
              trace={progressTrace}
              messages={progressMessages}
            >
              {t('sending')}
            </BlogChatAssistantLoading>
          )
        }}
        renderAssistantContent={({ message, defaultContent }) => {
          return (
            <BlogChatAssistantContent
              response={message.metadata?.blogChatResponse}
              progressTrace={message.metadata?.blogChatProgressTrace}
              progressMessages={progressMessages}
              locale={locale}
              defaultContent={defaultContent}
            />
          )
        }}
        renderMessageFooter={({ message }) => {
          return (
            <BlogChatMessageFooter
              response={message.metadata?.blogChatResponse}
              translate={t}
            />
          )
        }}
        renderSubmitContent={({ isSubmitting, isUploading }) => {
          return (
            <BlogChatSubmitContent
              isSubmitting={isSubmitting}
              isUploading={isUploading}
            />
          )
        }}
        renderTrigger={({ label, isOpen, toggle }) => {
          return (
            <button
              type="button"
              aria-label={isOpen ? t('close') : t('open')}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
              onClick={toggle}
            >
              <MessageCircleMore className="size-5" />
              {label}
            </button>
          )
        }}
      />
    </LeeChatProvider>
  )
}

function BlogChatAssistantContent({
  response,
  progressTrace,
  progressMessages,
  locale,
  defaultContent,
}: {
  response?: BlogChatResponse
  progressTrace?: BlogChatProgressTrace
  progressMessages: BlogChatProgressMessages
  locale: SupportedLocale
  defaultContent: ReactNode
}) {
  const answerContent =
    response?.refusalReason && !response.grounded ? (
      <p className="whitespace-pre-wrap leading-6">{response.answer}</p>
    ) : (
      defaultContent
    )

  if (!progressTrace) {
    return answerContent
  }

  return (
    <div className="flex flex-col gap-3">
      <BlogChatProgress
        locale={locale}
        trace={progressTrace}
        messages={progressMessages}
        pending={false}
      />
      {answerContent}
    </div>
  )
}

function BlogChatMessageFooter({
  response,
  translate,
}: {
  response?: BlogChatResponse
  translate: (
    key: string,
    values?: Record<string, string | number>,
  ) => string
}) {
  const t = translate
  const hasCitations = Boolean(
    response?.citations && response.citations.length > 0,
  )

  if (!hasCitations) {
    return null
  }

  return (
    <div className="mt-3 flex flex-col gap-2 border-t pt-3">
      <p className="text-muted-foreground mt-1 text-xs">{t('sources')}</p>
      {response?.citations.map((citation) => (
        <a
          key={citation.url}
          href={citation.url}
          className="hover:bg-muted/70 flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors"
        >
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{citation.title}</span>
            <span className="text-muted-foreground truncate text-xs">
              {citation.sectionTitle ?? citation.url}
            </span>
          </span>
          <ArrowUpRight className="size-4 shrink-0" />
        </a>
      ))}
    </div>
  )
}
