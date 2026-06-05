import { NextRequest, NextResponse } from 'next/server'
import type { LeeChatRequest, LeeChatResponse } from 'lee-chat-sdk'
import { answerBlogChatQuestion } from '@/features/chat/model/answer-blog-chat-question'
import type { BlogChatHistoryItem } from '@/features/chat/model/chat-schema'
import type { SupportedLocale } from '@/shared/config/constants'
import { LOCALES } from '@/shared/config/constants'

export const runtime = 'nodejs'

const CHAT_ROUTE = {
  UNEXPECTED_ERROR_MESSAGE:
    '답변을 준비하는 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.',
  SDK_ASSISTANT_MESSAGE_ID_SUFFIX: 'assistant',
  SDK_METADATA_RESPONSE_KEY: 'blogChatResponse',
  MAXIMUM_CONVERSATION_HISTORY_ITEM_COUNT: 2,
} as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isLeeChatRequest(requestBody: unknown): requestBody is LeeChatRequest {
  return (
    isRecord(requestBody) &&
    isRecord(requestBody.message) &&
    typeof requestBody.message.content === 'string' &&
    isRecord(requestBody.conversation) &&
    Array.isArray(requestBody.history)
  )
}

function resolveRequestLocale(metadata: Record<string, unknown> | undefined) {
  const locale = metadata?.locale

  return LOCALES.SUPPORTED.includes(locale as SupportedLocale)
    ? (locale as SupportedLocale)
    : LOCALES.DEFAULT
}

function resolveCurrentPostSlug(
  metadata: Record<string, unknown> | undefined,
): string | undefined {
  return typeof metadata?.currentPostSlug === 'string'
    ? metadata.currentPostSlug
    : undefined
}

function buildBlogChatConversationHistory(
  requestBody: LeeChatRequest,
): BlogChatHistoryItem[] {
  const conversationHistory: BlogChatHistoryItem[] = []
  let latestQuestion: string | undefined

  for (const historyItem of requestBody.history) {
    if (historyItem.role === 'user') {
      latestQuestion = historyItem.content
      continue
    }

    if (historyItem.role !== 'assistant' || !latestQuestion) {
      continue
    }

    conversationHistory.push({
      question: latestQuestion,
      answer: historyItem.content,
      citations: [],
    })
    latestQuestion = undefined
  }

  return conversationHistory.slice(
    -CHAT_ROUTE.MAXIMUM_CONVERSATION_HISTORY_ITEM_COUNT,
  )
}

function buildApplicationRequestBody(requestBody: unknown): unknown {
  if (!isLeeChatRequest(requestBody)) {
    return requestBody
  }

  return {
    question: requestBody.message.content,
    locale: resolveRequestLocale(requestBody.metadata),
    currentPostSlug: resolveCurrentPostSlug(requestBody.metadata),
    conversationHistory: buildBlogChatConversationHistory(requestBody),
  }
}

function buildLeeChatResponse(params: {
  requestBody: LeeChatRequest
  responseBody: Record<string, unknown>
}): LeeChatResponse {
  return {
    message: {
      id: `${params.requestBody.message.id}:${CHAT_ROUTE.SDK_ASSISTANT_MESSAGE_ID_SUFFIX}`,
      content:
        typeof params.responseBody.answer === 'string'
          ? params.responseBody.answer
          : CHAT_ROUTE.UNEXPECTED_ERROR_MESSAGE,
      metadata: {
        [CHAT_ROUTE.SDK_METADATA_RESPONSE_KEY]: params.responseBody,
      },
    },
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json()
    const result = await answerBlogChatQuestion({
      requestBody: buildApplicationRequestBody(requestBody),
      requestHeaders: request.headers,
    })
    const responseBody = isLeeChatRequest(requestBody)
      ? buildLeeChatResponse({
          requestBody,
          responseBody: result.body,
        })
      : result.body

    return NextResponse.json(responseBody, {
      status: result.status,
    })
  } catch {
    return NextResponse.json(
      {
        error: CHAT_ROUTE.UNEXPECTED_ERROR_MESSAGE,
      },
      { status: 500 },
    )
  }
}
