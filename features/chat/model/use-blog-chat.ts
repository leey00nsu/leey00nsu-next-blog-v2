'use client'

import { useMemo } from 'react'
import {
  createTextMessageParts,
  HttpChatTransport,
  type ChatMessage,
  type ChatPersistence,
  useChatController,
} from 'lee-chat-sdk'
import { z } from 'zod'
import {
  BlogChatResponseSchema,
  type BlogChatHistoryItem,
  type BlogChatResponse,
} from '@/features/chat/model/chat-schema'
import type { SupportedLocale } from '@/shared/config/constants'
import { LOCALES, ROUTES } from '@/shared/config/constants'

export type BlogChatConversationStatus = 'pending' | 'completed' | 'failed'
export type BlogChatErrorCode = 'request_failed'

export interface BlogChatConversationItemBase {
  id: string
  question: string
  status: BlogChatConversationStatus
}

export interface PendingBlogChatConversationItem
  extends BlogChatConversationItemBase {
  status: 'pending'
}

export interface CompletedBlogChatConversationItem
  extends BlogChatConversationItemBase {
  status: 'completed'
  response: BlogChatResponse
}

export interface FailedBlogChatConversationItem
  extends BlogChatConversationItemBase {
  status: 'failed'
  errorCode: BlogChatErrorCode
}

export type BlogChatConversationItem =
  | PendingBlogChatConversationItem
  | CompletedBlogChatConversationItem
  | FailedBlogChatConversationItem

interface UseBlogChatParams {
  locale: SupportedLocale
  currentPostSlug?: string
}

interface BlogChatRequest {
  question: string
  locale: SupportedLocale
  currentPostSlug?: string
  conversationHistory: BlogChatHistoryItem[]
}

interface BlogChatMessageMetadata {
  response: BlogChatResponse
}

const BLOG_CHAT_ERROR = {
  REQUEST_FAILED: 'request_failed' as const,
} as const

const BLOG_CHAT_CONVERSATION_HISTORY = {
  MAXIMUM_ITEM_COUNT: 2,
} as const

const BLOG_CHAT_LOCAL_STORAGE = {
  KEY_PREFIX: 'blog-chat-conversation',
  STORAGE_VERSION: 1,
  MAXIMUM_PERSISTED_CONVERSATION_ITEM_COUNT: 20,
  MAXIMUM_NEW_CONVERSATION_ITEM_COUNT: 1,
} as const

const BLOG_CHAT_SDK = {
  CONVERSATION_ID_PREFIX: 'blog-chat',
  USER_SENDER_ID: 'blog-chat-user',
  ASSISTANT_SENDER_ID: 'blog-chat-assistant',
} as const

const BlogChatConversationItemBaseSchema = z.object({
  id: z.string().trim().min(1),
  question: z.string().trim().min(1),
})

const CompletedBlogChatConversationItemSchema =
  BlogChatConversationItemBaseSchema.extend({
    status: z.literal('completed'),
    response: BlogChatResponseSchema,
  })

const FailedBlogChatConversationItemSchema =
  BlogChatConversationItemBaseSchema.extend({
    status: z.literal('failed'),
    errorCode: z.literal(BLOG_CHAT_ERROR.REQUEST_FAILED),
  })

const PersistedBlogChatConversationItemSchema = z.union([
  CompletedBlogChatConversationItemSchema,
  FailedBlogChatConversationItemSchema,
])

const PersistedBlogChatConversationSchema = z.object({
  version: z.literal(BLOG_CHAT_LOCAL_STORAGE.STORAGE_VERSION),
  locale: z.enum(LOCALES.SUPPORTED),
  conversationItems: z
    .array(PersistedBlogChatConversationItemSchema)
    .max(BLOG_CHAT_LOCAL_STORAGE.MAXIMUM_PERSISTED_CONVERSATION_ITEM_COUNT),
})

function createConversationItemId(): string {
  return globalThis.crypto?.randomUUID() ?? `blog-chat-${Date.now()}`
}

export function buildBlogChatConversationStorageKey(
  locale: SupportedLocale,
): string {
  return `${BLOG_CHAT_LOCAL_STORAGE.KEY_PREFIX}:${locale}`
}

function readPersistedConversationItems(
  locale: SupportedLocale,
): BlogChatConversationItem[] {
  if (globalThis.window === undefined) {
    return []
  }

  const persistedValue = globalThis.localStorage.getItem(
    buildBlogChatConversationStorageKey(locale),
  )

  if (!persistedValue) {
    return []
  }

  let parsedValue: unknown

  try {
    parsedValue = JSON.parse(persistedValue)
  } catch {
    return []
  }

  const parsedPayload = PersistedBlogChatConversationSchema.safeParse(
    parsedValue,
  )

  if (!parsedPayload.success) {
    return []
  }

  return parsedPayload.data.conversationItems
}

function createBlogChatTransport(): HttpChatTransport<BlogChatRequest, unknown> {
  return new HttpChatTransport<BlogChatRequest, unknown>({
    endpoint: ROUTES.API.CHAT,
  })
}

function createBlogChatMessage(params: {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  status: 'sent' | 'failed'
  createdAt: string
  metadata?: BlogChatMessageMetadata
}): ChatMessage<BlogChatMessageMetadata> {
  return {
    id: params.id,
    conversationId: params.conversationId,
    senderId:
      params.role === 'user'
        ? BLOG_CHAT_SDK.USER_SENDER_ID
        : BLOG_CHAT_SDK.ASSISTANT_SENDER_ID,
    role: params.role,
    content: params.content,
    parts: createTextMessageParts(params.content),
    status: params.status,
    createdAt: params.createdAt,
    metadata: params.metadata,
  }
}

function buildBlogChatConversationId(locale: SupportedLocale): string {
  return `${BLOG_CHAT_SDK.CONVERSATION_ID_PREFIX}:${locale}`
}

function buildPendingConversationItem(params: {
  id: string
  question: string
}): PendingBlogChatConversationItem {
  return {
    id: params.id,
    question: params.question,
    status: 'pending',
  }
}

function buildCompletedConversationItem(params: {
  id: string
  question: string
  response: BlogChatResponse
}): CompletedBlogChatConversationItem {
  return {
    id: params.id,
    question: params.question,
    status: 'completed',
    response: params.response,
  }
}

function buildFailedConversationItem(params: {
  id: string
  question: string
}): FailedBlogChatConversationItem {
  return {
    id: params.id,
    question: params.question,
    status: 'failed',
    errorCode: BLOG_CHAT_ERROR.REQUEST_FAILED,
  }
}

function buildPersistedConversationItems(
  conversationItems: BlogChatConversationItem[],
): Array<CompletedBlogChatConversationItem | FailedBlogChatConversationItem> {
  return conversationItems
    .filter((conversationItem) => {
      return conversationItem.status !== 'pending'
    })
    .slice(-BLOG_CHAT_LOCAL_STORAGE.MAXIMUM_PERSISTED_CONVERSATION_ITEM_COUNT)
}

function buildConversationHistoryFromConversationItems(
  conversationItems: BlogChatConversationItem[],
): BlogChatHistoryItem[] {
  return conversationItems
    .filter((conversationItem) => {
      return conversationItem.status === 'completed'
    })
    .slice(-BLOG_CHAT_CONVERSATION_HISTORY.MAXIMUM_ITEM_COUNT)
    .map((conversationItem) => {
      return {
        question: conversationItem.question,
        answer: conversationItem.response.answer,
        citations: conversationItem.response.citations,
      }
    })
}

function buildConversationItemsFromMessages(
  messages: Array<ChatMessage<BlogChatMessageMetadata>>,
): BlogChatConversationItem[] {
  const conversationItems: BlogChatConversationItem[] = []
  let latestSentUserMessage: ChatMessage<BlogChatMessageMetadata> | undefined

  for (const message of messages) {
    if (message.role === 'user' && message.status === 'sending') {
      latestSentUserMessage = undefined
      conversationItems.push(
        buildPendingConversationItem({
          id: message.id,
          question: message.content,
        }),
      )
      continue
    }

    if (message.role === 'user' && message.status === 'failed') {
      latestSentUserMessage = undefined
      conversationItems.push(
        buildFailedConversationItem({
          id: message.id,
          question: message.content,
        }),
      )
      continue
    }

    if (message.role === 'user' && message.status === 'sent') {
      latestSentUserMessage = message
      continue
    }

    if (
      message.role !== 'assistant' ||
      !latestSentUserMessage ||
      !message.metadata?.response
    ) {
      continue
    }

    conversationItems.push(
      buildCompletedConversationItem({
        id: latestSentUserMessage.id,
        question: latestSentUserMessage.content,
        response: message.metadata.response,
      }),
    )
    latestSentUserMessage = undefined
  }

  return conversationItems.slice(
    -BLOG_CHAT_LOCAL_STORAGE.MAXIMUM_PERSISTED_CONVERSATION_ITEM_COUNT,
  )
}

function buildMessagesFromPersistedConversationItems(params: {
  conversationId: string
  conversationItems: BlogChatConversationItem[]
}): Array<ChatMessage<BlogChatMessageMetadata>> {
  return params.conversationItems.flatMap((conversationItem) => {
    const createdAt = new Date().toISOString()

    if (conversationItem.status === 'failed') {
      return [
        createBlogChatMessage({
          id: conversationItem.id,
          conversationId: params.conversationId,
          role: 'user',
          content: conversationItem.question,
          status: 'failed',
          createdAt,
        }),
      ]
    }

    if (conversationItem.status !== 'completed') {
      return []
    }

    return [
      createBlogChatMessage({
        id: conversationItem.id,
        conversationId: params.conversationId,
        role: 'user',
        content: conversationItem.question,
        status: 'sent',
        createdAt,
      }),
      createBlogChatMessage({
        id: `${conversationItem.id}:assistant`,
        conversationId: params.conversationId,
        role: 'assistant',
        content: conversationItem.response.answer,
        status: 'sent',
        createdAt,
        metadata: {
          response: conversationItem.response,
        },
      }),
    ]
  })
}

function createBlogChatPersistence(params: {
  locale: SupportedLocale
  conversationId: string
}): ChatPersistence<ChatMessage<BlogChatMessageMetadata>> {
  return {
    read() {
      return buildMessagesFromPersistedConversationItems({
        conversationId: params.conversationId,
        conversationItems: readPersistedConversationItems(params.locale),
      })
    },
    write(messages) {
      if (globalThis.window === undefined) {
        return
      }

      const storageKey = buildBlogChatConversationStorageKey(params.locale)
      const persistedConversationItems = buildPersistedConversationItems(
        buildConversationItemsFromMessages(messages),
      )

      if (persistedConversationItems.length === 0) {
        globalThis.localStorage.removeItem(storageKey)
        return
      }

      globalThis.localStorage.setItem(
        storageKey,
        JSON.stringify({
          version: BLOG_CHAT_LOCAL_STORAGE.STORAGE_VERSION,
          locale: params.locale,
          conversationItems: persistedConversationItems,
        }),
      )
    },
    clear() {
      if (globalThis.window === undefined) {
        return
      }

      globalThis.localStorage.removeItem(
        buildBlogChatConversationStorageKey(params.locale),
      )
    },
  }
}

export function useBlogChat({
  locale,
  currentPostSlug,
}: UseBlogChatParams) {
  const conversationId = buildBlogChatConversationId(locale)
  const transport = useMemo(() => createBlogChatTransport(), [])
  const persistence = useMemo(() => {
    return createBlogChatPersistence({ locale, conversationId })
  }, [conversationId, locale])
  const chatController = useChatController<
    BlogChatRequest,
    unknown,
    BlogChatMessageMetadata
  >({
    conversationId,
    transport,
    persistence,
    senderId: BLOG_CHAT_SDK.USER_SENDER_ID,
    assistantSenderId: BLOG_CHAT_SDK.ASSISTANT_SENDER_ID,
    createMessageId: createConversationItemId,
    buildRequest: ({ content, messages }) => {
      return {
        question: content,
        locale,
        currentPostSlug,
        conversationHistory: buildConversationHistoryFromConversationItems(
          buildConversationItemsFromMessages(messages),
        ),
      }
    },
    buildAssistantMessage: ({ response }) => {
      const parsedResponse = BlogChatResponseSchema.safeParse(response)

      if (!parsedResponse.success) {
        throw new Error('Invalid response')
      }

      return {
        content: parsedResponse.data.answer,
        metadata: {
          response: parsedResponse.data,
        },
      }
    },
  })
  const conversationItems = buildConversationItemsFromMessages(
    chatController.messages,
  )

  return {
    conversationItems,
    isLoading: chatController.isSubmitting,
    question: chatController.inputValue,
    setQuestion: chatController.setInputValue,
    submitQuestion: chatController.submitMessage,
  }
}
