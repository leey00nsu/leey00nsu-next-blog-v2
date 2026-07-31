import { NextRequest, NextResponse } from 'next/server'
import {
  collectLeeChatTurnHistory,
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
import {
  EMPTY_BLOG_CHAT_PROGRESS_TRACE,
  reduceBlogChatProgressTrace,
  type BlogChatProgressEvent,
  type BlogChatProgressTrace,
} from '@/features/chat/model/blog-chat-progress'
import type { SupportedLocale } from '@/shared/config/constants'
import { LOCALES } from '@/shared/config/constants'

export const runtime = 'nodejs'

const CHAT_ROUTE = {
  UNEXPECTED_ERROR_MESSAGE:
    '답변을 준비하는 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.',
  MAXIMUM_CONVERSATION_HISTORY_ITEM_COUNT: 2,
  DEFAULT_RESPONSE_STATUS: 200,
  PROGRESS_STREAM_ACCEPT: 'text/event-stream',
  PROGRESS_STREAM_EVENT_NAME: 'blog-chat-progress',
} as const

interface BlogChatRequestMetadata {
  locale?: unknown
  currentPostSlug?: unknown
}

interface BlogChatMessageMetadata {
  blogChatResponse: BlogChatResponse | Record<string, unknown>
  conversationState?: ChatConversationState | Record<string, unknown>
  blogChatProgressTrace?: BlogChatProgressTrace
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
  progressTrace?: BlogChatProgressTrace
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
          blogChatProgressTrace: params.progressTrace,
        },
      })
    : params.applicationResponseBody

  return {
    body: responseBody,
    status:
      params.applicationResponseStatus ?? CHAT_ROUTE.DEFAULT_RESPONSE_STATUS,
  }
}

function resolveProgressSources(
  responseBody: unknown,
): BlogChatProgressTrace['sources'] {
  const blogChatResponse = resolveBlogChatResponse(responseBody)
  const parsedResponse = BlogChatResponseSchema.safeParse(blogChatResponse)

  return parsedResponse.success
    ? parsedResponse.data.citations.map((citation) => {
        return {
          title: citation.title,
          url: citation.url,
          sourceCategory: citation.sourceCategory,
          sectionTitle: citation.sectionTitle,
        }
      })
    : []
}

function formatProgressStreamEnvelope(envelope: unknown): Uint8Array {
  const serializedEnvelope = JSON.stringify(envelope)
  const serializedEvent = [
    `event: ${CHAT_ROUTE.PROGRESS_STREAM_EVENT_NAME}`,
    `data: ${serializedEnvelope}`,
    '',
    '',
  ].join('\n')

  return new TextEncoder().encode(serializedEvent)
}

function createBlogChatProgressStreamResponse(params: {
  request: NextRequest
  requestBody: unknown
}): Response {
  const requestStartedAt = Date.now()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let progressTrace = EMPTY_BLOG_CHAT_PROGRESS_TRACE
      let streamClosed = false

      const enqueueEnvelope = (envelope: unknown) => {
        if (streamClosed || params.request.signal.aborted) {
          return
        }

        controller.enqueue(formatProgressStreamEnvelope(envelope))
      }

      const reportProgress = (event: BlogChatProgressEvent) => {
        progressTrace = reduceBlogChatProgressTrace(progressTrace, event)
        enqueueEnvelope({
          type: 'progress',
          event,
        })
      }

      const closeStream = () => {
        if (streamClosed) {
          return
        }

        streamClosed = true
        controller.close()
      }

      void (async () => {
        try {
          const applicationRequestBody = buildApplicationRequestBody(
            params.requestBody,
          )
          const applicationResult = await answerBlogChatQuestion({
            requestBody: applicationRequestBody,
            requestHeaders: params.request.headers,
            reportProgress,
          })

          reportProgress({
            type: 'sources',
            sources: resolveProgressSources(applicationResult.body),
          })
          reportProgress({
            type: 'completed',
            elapsedMilliseconds: Date.now() - requestStartedAt,
          })

          const routeResult = buildBlogChatRouteResult({
            requestBody: params.requestBody,
            applicationResponseBody: applicationResult.body,
            applicationResponseStatus: applicationResult.status,
            progressTrace,
          })

          enqueueEnvelope({
            type: 'result',
            status: routeResult.status,
            body: routeResult.body,
          })
        } catch {
          reportProgress({ type: 'failed' })
          enqueueEnvelope({
            type: 'result',
            status: 500,
            body: {
              error: CHAT_ROUTE.UNEXPECTED_ERROR_MESSAGE,
            },
          })
        } finally {
          closeStream()
        }
      })()
    },
  })

  return new Response(stream, {
    headers: {
      'Cache-Control': 'no-cache, no-transform',
      'Content-Type': `${CHAT_ROUTE.PROGRESS_STREAM_ACCEPT}; charset=utf-8`,
      'X-Accel-Buffering': 'no',
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
      return createBlogChatProgressStreamResponse({
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
