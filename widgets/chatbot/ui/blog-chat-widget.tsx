'use client'

import type { ReactNode } from 'react'
import {
  type ChatMessage,
  LeeChatProvider,
  LeeChatWidget,
} from 'lee-chat-sdk'
import { ArrowUpRight, MessageCircleMore } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import type { BlogChatResponse } from '@/features/chat/model/chat-schema'
import type { SupportedLocale } from '@/shared/config/constants'
import { ROUTES } from '@/shared/config/constants'

const BLOG_CHAT_WIDGET_PATH = {
  VISIBLE_PATH_PATTERN: /^\/(ko|en)\/(blog|about)(\/|$)/,
  BLOG_DETAIL_PATH_PATTERN: /^\/(ko|en)\/blog\/([^/?#]+)$/,
} as const
const BLOG_CHAT_SDK = {
  APP_ID: 'leey00nsu-next-blog',
  CONVERSATION_ID_PREFIX: 'blog-chat',
  METADATA_RESPONSE_KEY: 'blogChatResponse',
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
    <LeeChatProvider
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
        texts: {
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
      <LeeChatWidget
        renderMessage={({ message }) => {
          return <BlogChatMessage message={message} translate={t} />
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

function resolveBlogChatResponse(
  message: ChatMessage<Record<string, unknown>>,
): BlogChatResponse | undefined {
  const response = message.metadata?.[BLOG_CHAT_SDK.METADATA_RESPONSE_KEY]

  return typeof response === 'object' && response !== null
    ? (response as BlogChatResponse)
    : undefined
}

function BlogChatMessage({
  message,
  translate,
}: {
  message: ChatMessage<Record<string, unknown>>
  translate: (key: string) => string
}): ReactNode {
  const t = translate
  const response = resolveBlogChatResponse(message)

  if (message.role === 'user') {
    return (
      <div className="ml-8 rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground">
        <p className="mb-1 text-xs opacity-80">{t('you')}</p>
        <p className="whitespace-pre-wrap leading-6">{message.content}</p>
      </div>
    )
  }

  return (
    <div className="mr-8 rounded-2xl border bg-card px-4 py-3 text-sm">
      <p className="text-muted-foreground mb-2 text-xs">{t('assistant')}</p>
      <p className="whitespace-pre-wrap leading-6">
        {response?.refusalReason && !response.grounded
          ? t(`refusal.${response.refusalReason}`)
          : message.content}
      </p>
      {response?.citations && response.citations.length > 0 ? (
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
      ) : null}
    </div>
  )
}
