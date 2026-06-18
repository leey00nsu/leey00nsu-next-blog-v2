'use client'

import type { ReactNode } from 'react'
import {
  LEE_CHAT_TEXT_PRESETS,
  LeeChatProvider,
  LeeChatWidget,
} from 'lee-chat-sdk'
import { ArrowUpRight, MessageCircleMore } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import type { BlogChatResponse } from '@/features/chat/model/chat-schema'
import type { ChatConversationState } from '@/features/chat/model/chat-conversation-state'
import type { SupportedLocale } from '@/shared/config/constants'
import { ROUTES } from '@/shared/config/constants'
import { BlogChatAssistantLoading } from '@/widgets/chatbot/ui/blog-chat-assistant-loading'
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
  translate: (key: string) => string
}

interface BlogChatMessageMetadata {
  blogChatResponse?: BlogChatResponse
  conversationState?: ChatConversationState
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
    >
      <LeeChatWidget<BlogChatMessageMetadata>
        renderAssistantLoading={() => {
          return (
            <BlogChatAssistantLoading>{t('sending')}</BlogChatAssistantLoading>
          )
        }}
        renderAssistantContent={({ message, defaultContent }) => {
          return (
            <BlogChatAssistantContent
              response={message.metadata?.blogChatResponse}
              defaultContent={defaultContent}
              translate={t}
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
  defaultContent,
  translate,
}: {
  response?: BlogChatResponse
  defaultContent: ReactNode
  translate: (key: string) => string
}) {
  const t = translate

  if (response?.refusalReason && !response.grounded) {
    return (
      <p className="whitespace-pre-wrap leading-6">
        {t(`refusal.${response.refusalReason}`)}
      </p>
    )
  }

  return defaultContent
}

function BlogChatMessageFooter({
  response,
  translate,
}: {
  response?: BlogChatResponse
  translate: (key: string) => string
}) {
  const t = translate

  if (!response?.citations || response.citations.length === 0) {
    return null
  }

  return (
    <div className="mt-3 flex flex-col gap-2 border-t pt-3">
      <p className="text-muted-foreground text-xs">{t('sources')}</p>
      {response.citations.map((citation) => (
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
