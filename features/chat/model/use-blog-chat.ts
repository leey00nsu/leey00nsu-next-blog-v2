'use client'

import { useState } from 'react'
import {
  BlogChatResponseSchema,
  type BlogChatHistoryItem,
} from '@/features/chat/model/chat-schema'
import type { ChatSourceCategory } from '@/features/chat/model/chat-evidence'
import { ROUTES, type SupportedLocale } from '@/shared/config/constants'

export interface BlogChatConversationItem {
  id: string
  question: string
  response: {
    answer: string
    citations: {
      title: string
      url: string
      sectionTitle: string | null
      sourceCategory: ChatSourceCategory
    }[]
    grounded: boolean
    refusalReason?:
      | 'insufficient_search_match'
      | 'insufficient_evidence'
      | 'invalid_citations'
      | 'missing_api_key'
      | 'model_error'
      | 'question_too_long'
      | 'daily_limit_exceeded'
  }
}

interface UseBlogChatParams {
  locale: SupportedLocale
  currentPostSlug?: string
}

const BLOG_CHAT_ERROR_MESSAGE = 'request_failed'
const MAXIMUM_CONVERSATION_HISTORY_COUNT = 2

function createConversationItemId(): string {
  return globalThis.crypto?.randomUUID() ?? `blog-chat-${Date.now()}`
}

export function useBlogChat({
  locale,
  currentPostSlug,
}: UseBlogChatParams) {
  const [conversationItems, setConversationItems] = useState<
    BlogChatConversationItem[]
  >([])
  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorCode, setErrorCode] = useState<string | null>(null)

  function buildConversationHistory(): BlogChatHistoryItem[] {
    return conversationItems
      .slice(-MAXIMUM_CONVERSATION_HISTORY_COUNT)
      .map((conversationItem) => {
        return {
          question: conversationItem.question,
          answer: conversationItem.response.answer,
          citations: conversationItem.response.citations,
        }
      })
  }

  async function submitQuestion(): Promise<void> {
    const trimmedQuestion = question.trim()

    if (!trimmedQuestion || isLoading) {
      return
    }

    setIsLoading(true)
    setErrorCode(null)

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
          conversationHistory: buildConversationHistory(),
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
        return [
          ...previousConversationItems,
          {
            id: createConversationItemId(),
            question: trimmedQuestion,
            response: parsedResponse.data,
          },
        ]
      })
      setQuestion('')
    } catch {
      setErrorCode(BLOG_CHAT_ERROR_MESSAGE)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    conversationItems,
    errorCode,
    isLoading,
    question,
    setQuestion,
    submitQuestion,
  }
}
