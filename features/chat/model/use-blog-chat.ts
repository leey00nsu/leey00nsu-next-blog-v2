'use client'

import { useEffect, useState } from 'react'
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

const MAXIMUM_PREVIOUS_ITEMS_TO_KEEP =
  BLOG_CHAT_LOCAL_STORAGE.MAXIMUM_PERSISTED_CONVERSATION_ITEM_COUNT -
  BLOG_CHAT_LOCAL_STORAGE.MAXIMUM_NEW_CONVERSATION_ITEM_COUNT

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

function replaceConversationItem(
  conversationItems: BlogChatConversationItem[],
  nextConversationItem: BlogChatConversationItem,
): BlogChatConversationItem[] {
  return conversationItems.map((conversationItem) => {
    if (conversationItem.id !== nextConversationItem.id) {
      return conversationItem
    }

    return nextConversationItem
  })
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

function buildConversationHistory(
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

export function useBlogChat({
  locale,
  currentPostSlug,
}: UseBlogChatParams) {
  const [conversationItems, setConversationItems] = useState<
    BlogChatConversationItem[]
  >(() => {
    return readPersistedConversationItems(locale)
  })
  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (globalThis.window === undefined) {
      return
    }

    const storageKey = buildBlogChatConversationStorageKey(locale)
    const persistedConversationItems = buildPersistedConversationItems(
      conversationItems,
    )

    if (persistedConversationItems.length === 0) {
      globalThis.localStorage.removeItem(storageKey)
      return
    }

    globalThis.localStorage.setItem(
      storageKey,
      JSON.stringify({
        version: BLOG_CHAT_LOCAL_STORAGE.STORAGE_VERSION,
        locale,
        conversationItems: persistedConversationItems,
      }),
    )
  }, [conversationItems, locale])

  async function submitQuestion(): Promise<void> {
    const trimmedQuestion = question.trim()

    if (!trimmedQuestion || isLoading) {
      return
    }

    const conversationItemId = createConversationItemId()

    setConversationItems((previousConversationItems) => {
      return [
        ...previousConversationItems.slice(-MAXIMUM_PREVIOUS_ITEMS_TO_KEEP),
        buildPendingConversationItem({
          id: conversationItemId,
          question: trimmedQuestion,
        }),
      ]
    })
    setQuestion('')
    setIsLoading(true)

    try {
      const response = await fetch(ROUTES.API.CHAT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: trimmedQuestion,
          locale,
          currentPostSlug,
          conversationHistory: buildConversationHistory(conversationItems),
        }),
      })

      if (!response.ok) {
        throw new Error('Request failed')
      }

      const parsedResponse = BlogChatResponseSchema.safeParse(
        await response.json(),
      )

      if (!parsedResponse.success) {
        throw new Error('Invalid response')
      }

      setConversationItems((previousConversationItems) => {
        return replaceConversationItem(
          previousConversationItems,
          buildCompletedConversationItem({
            id: conversationItemId,
            question: trimmedQuestion,
            response: parsedResponse.data,
          }),
        )
      })
    } catch {
      setConversationItems((previousConversationItems) => {
        return replaceConversationItem(
          previousConversationItems,
          buildFailedConversationItem({
            id: conversationItemId,
            question: trimmedQuestion,
          }),
        )
      })
    } finally {
      setIsLoading(false)
    }
  }

  return {
    conversationItems,
    isLoading,
    question,
    setQuestion,
    submitQuestion,
  }
}
