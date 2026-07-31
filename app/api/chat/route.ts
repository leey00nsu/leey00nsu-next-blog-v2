import { NextRequest, NextResponse } from 'next/server'
import type { ChatActivityEvent, ChatActivityReference } from 'lee-chat-sdk'
import {
  collectLeeChatTurnHistory,
  createLeeChatRequestStreamResponse,
  createLeeChatTextResponse,
  getLeeChatRequestMetadata,
  getLeeChatRequestText,
  isLeeChatRequest,
} from 'lee-chat-sdk/server'
import { answerBlogChatQuestion } from '@/features/chat/model/answer-blog-chat-question'
import {
  ChatConversationStateSchema,
  EMPTY_CHAT_CONVERSATION_STATE,
  type ChatConversationState,
} from '@/features/chat/model/chat-conversation-state'
import type {
  BlogChatHistoryItem,
  BlogChatResponse,
} from '@/features/chat/model/chat-schema'
import { BlogChatResponseSchema } from '@/features/chat/model/chat-schema'
import { BlogChatApplicationResponseSchema } from '@/features/chat/model/chat-schema'
import type { SupportedLocale } from '@/shared/config/constants'
import { LOCALES } from '@/shared/config/constants'

export const runtime = 'nodejs'

const CHAT_ROUTE = {
  UNEXPECTED_ERROR_MESSAGE:
    '답변을 준비하는 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.',
  MAXIMUM_CONVERSATION_HISTORY_ITEM_COUNT: 2,
  DEFAULT_RESPONSE_STATUS: 200,
  PROGRESS_STREAM_ACCEPT: 'text/event-stream',
  REQUEST_STREAM_ERROR_CODE: 'blog_chat_request_failed',
} as const

interface BlogChatRequestMetadata {
  locale?: unknown
  currentPostSlug?: unknown
}

interface BlogChatMessageMetadata {
  blogChatResponse: BlogChatResponse | Record<string, unknown>
  conversationState?: ChatConversationState | Record<string, unknown>
}

interface BlogChatRouteResult {
  body: unknown
  status: number
}

function resolveRequestLocale(metadata: BlogChatRequestMetadata | undefined) {
  const locale = metadata?.locale

  return LOCALES.SUPPORTED.includes(locale as SupportedLocale)
    ? (locale as SupportedLocale)
    : LOCALES.DEFAULT
}

function resolveCurrentPostSlug(
  metadata: BlogChatRequestMetadata | undefined,
): string | undefined {
  return typeof metadata?.currentPostSlug === 'string'
    ? metadata.currentPostSlug
    : undefined
}

function buildBlogChatConversationHistory(requestBody: unknown) {
  if (!isLeeChatRequest(requestBody)) {
    return []
  }

  return collectLeeChatTurnHistory(requestBody)
    .filter((turnHistoryItem) => {
      const assistantHistoryItem = requestBody.history.find((historyItem) => {
        return (
          historyItem.role === turnHistoryItem.assistant?.role &&
          historyItem.senderId === turnHistoryItem.assistant?.senderId &&
          historyItem.createdAt === turnHistoryItem.assistant?.createdAt
        )
      })
      const assistantResponse =
        resolveAssistantBlogChatResponse(assistantHistoryItem)

      return (
        Boolean(turnHistoryItem.assistant) && !assistantResponse?.refusalReason
      )
    })
    .slice(-CHAT_ROUTE.MAXIMUM_CONVERSATION_HISTORY_ITEM_COUNT)
    .map<BlogChatHistoryItem>((turnHistoryItem) => {
      return {
        question: turnHistoryItem.user.content,
        answer: turnHistoryItem.assistant?.content ?? '',
        citations:
          resolveAssistantBlogChatResponse(
            requestBody.history.find((historyItem) => {
              return (
                historyItem.role === turnHistoryItem.assistant?.role &&
                historyItem.senderId === turnHistoryItem.assistant.senderId &&
                historyItem.createdAt === turnHistoryItem.assistant.createdAt
              )
            }),
          )?.citations ?? [],
      }
    })
}

function resolveAssistantBlogChatResponse(
  historyItem: unknown,
): BlogChatResponse | null {
  if (
    !historyItem ||
    typeof historyItem !== 'object' ||
    !('metadata' in historyItem) ||
    typeof historyItem.metadata !== 'object'
  ) {
    return null
  }

  const metadata = historyItem.metadata as BlogChatMessageMetadata
  const parsedResponse = BlogChatResponseSchema.safeParse(
    metadata.blogChatResponse,
  )

  return parsedResponse.success ? parsedResponse.data : null
}

function resolveAssistantConversationState(
  historyItem: unknown,
): ChatConversationState | null {
  if (
    !historyItem ||
    typeof historyItem !== 'object' ||
    !('metadata' in historyItem) ||
    typeof historyItem.metadata !== 'object' ||
    historyItem.metadata === null ||
    !('conversationState' in historyItem.metadata)
  ) {
    return null
  }

  const parsedState = ChatConversationStateSchema.safeParse(
    historyItem.metadata.conversationState,
  )

  return parsedState.success ? parsedState.data : null
}

function resolveLatestConversationState(
  requestBody: Parameters<typeof isLeeChatRequest>[0],
): ChatConversationState {
  if (!isLeeChatRequest(requestBody)) {
    return EMPTY_CHAT_CONVERSATION_STATE
  }

  for (const historyItem of requestBody.history.toReversed()) {
    if (historyItem.role !== 'assistant') {
      continue
    }

    const conversationState = resolveAssistantConversationState(historyItem)

    if (conversationState) {
      return conversationState
    }
  }

  return EMPTY_CHAT_CONVERSATION_STATE
}

function buildApplicationRequestBody(requestBody: unknown): unknown {
  if (!isLeeChatRequest(requestBody)) {
    return requestBody
  }

  const metadata =
    getLeeChatRequestMetadata<BlogChatRequestMetadata>(requestBody)

  return {
    question: getLeeChatRequestText(requestBody),
    locale: resolveRequestLocale(metadata),
    currentPostSlug: resolveCurrentPostSlug(metadata),
    conversationHistory: buildBlogChatConversationHistory(requestBody),
    conversationState: resolveLatestConversationState(requestBody),
  }
}

function resolveBlogChatResponse(responseBody: unknown): unknown {
  const parsedApplicationResponse =
    BlogChatApplicationResponseSchema.safeParse(responseBody)

  return parsedApplicationResponse.success
    ? parsedApplicationResponse.data.response
    : responseBody
}

function resolveResponseConversationState(params: {
  responseBody: unknown
  requestBody: unknown
}): ChatConversationState {
  const parsedApplicationResponse = BlogChatApplicationResponseSchema.safeParse(
    params.responseBody,
  )

  return parsedApplicationResponse.success
    ? parsedApplicationResponse.data.conversationState
    : resolveLatestConversationState(params.requestBody)
}

function resolveResponseAnswer(responseBody: Record<string, unknown>): string {
  return typeof responseBody.answer === 'string'
    ? responseBody.answer
    : CHAT_ROUTE.UNEXPECTED_ERROR_MESSAGE
}

function buildBlogChatRouteResult(params: {
  requestBody: unknown
  applicationResponseBody: unknown
  applicationResponseStatus?: number
}): BlogChatRouteResult {
  const blogChatResponse = resolveBlogChatResponse(
    params.applicationResponseBody,
  )
  const responseBody = isLeeChatRequest(params.requestBody)
    ? createLeeChatTextResponse<BlogChatMessageMetadata>({
        request: params.requestBody,
        content: resolveResponseAnswer(
          blogChatResponse as Record<string, unknown>,
        ),
        metadata: {
          blogChatResponse: blogChatResponse as Record<string, unknown>,
          conversationState: resolveResponseConversationState({
            responseBody: params.applicationResponseBody,
            requestBody: params.requestBody,
          }),
        },
      })
    : params.applicationResponseBody

  return {
    body: responseBody,
    status:
      params.applicationResponseStatus ?? CHAT_ROUTE.DEFAULT_RESPONSE_STATUS,
  }
}

function resolveActivityReferences(
  responseBody: unknown,
): ChatActivityReference[] {
  const blogChatResponse = resolveBlogChatResponse(responseBody)
  const parsedResponse = BlogChatResponseSchema.safeParse(blogChatResponse)

  return parsedResponse.success
    ? parsedResponse.data.citations.map((citation) => {
        return {
          id: citation.url,
          label: citation.sectionTitle
            ? `${citation.title} · ${citation.sectionTitle}`
            : citation.title,
          href: citation.url,
        }
      })
    : []
}

class BlogChatRequestStreamError extends Error {
  readonly status: number

  constructor(status: number) {
    super(CHAT_ROUTE.UNEXPECTED_ERROR_MESSAGE)
    this.status = status
  }
}

function createBlogChatRequestStreamResponse(params: {
  request: NextRequest
  requestBody: unknown
}): Response {
  const requestStartedAt = Date.now()

  return createLeeChatRequestStreamResponse<ChatActivityEvent, unknown>({
    request: params.request,
    execute: async ({ emitProgress, signal }) => {
      const applicationRequestBody = buildApplicationRequestBody(
        params.requestBody,
      )
      const applicationResult = await answerBlogChatQuestion({
        requestBody: applicationRequestBody,
        requestHeaders: params.request.headers,
        reportProgress: emitProgress,
        signal,
      })
      const routeResult = buildBlogChatRouteResult({
        requestBody: params.requestBody,
        applicationResponseBody: applicationResult.body,
        applicationResponseStatus: applicationResult.status,
      })

      if (routeResult.status < 200 || routeResult.status >= 300) {
        throw new BlogChatRequestStreamError(routeResult.status)
      }

      emitProgress({
        type: 'references',
        references: resolveActivityReferences(applicationResult.body),
      })
      emitProgress({
        type: 'completed',
        elapsedMilliseconds: Date.now() - requestStartedAt,
      })

      return routeResult.body
    },
    serializeError: (error) => {
      return {
        code: CHAT_ROUTE.REQUEST_STREAM_ERROR_CODE,
        message: CHAT_ROUTE.UNEXPECTED_ERROR_MESSAGE,
        status:
          error instanceof BlogChatRequestStreamError ? error.status : 500,
        retryable: false,
      }
    },
  })
}

function acceptsProgressStream(request: NextRequest): boolean {
  return (
    request.headers
      .get('accept')
      ?.includes(CHAT_ROUTE.PROGRESS_STREAM_ACCEPT) ?? false
  )
}

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json()

    if (isLeeChatRequest(requestBody) && acceptsProgressStream(request)) {
      return createBlogChatRequestStreamResponse({
        request,
        requestBody,
      })
    }

    const applicationRequestBody = buildApplicationRequestBody(requestBody)
    const applicationResult = await answerBlogChatQuestion({
      requestBody: applicationRequestBody,
      requestHeaders: request.headers,
    })
    const routeResult = buildBlogChatRouteResult({
      requestBody,
      applicationResponseBody: applicationResult.body,
      applicationResponseStatus: applicationResult.status,
    })

    return NextResponse.json(routeResult.body, {
      status: routeResult.status,
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
