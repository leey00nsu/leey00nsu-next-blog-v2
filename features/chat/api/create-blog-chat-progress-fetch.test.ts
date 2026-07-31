import { describe, expect, it, vi } from 'vitest'
import { createBlogChatProgressFetch } from '@/features/chat/api/create-blog-chat-progress-fetch'

const BLOG_CHAT_PROGRESS_FETCH_TEST = {
  ENDPOINT: '/api/chat',
  STREAM_CONTENT_TYPE: 'text/event-stream',
} as const

function serializeStreamEnvelope(envelope: unknown): string {
  return `event: blog-chat-progress\ndata: ${JSON.stringify(envelope)}\n\n`
}

describe('createBlogChatProgressFetch', () => {
  it('분할된 진행 스트림을 처리하고 최종 JSON 응답으로 변환한다', async () => {
    const serializedStream = [
      serializeStreamEnvelope({
        type: 'progress',
        event: {
          type: 'stage',
          stage: 'understanding_question',
        },
      }),
      serializeStreamEnvelope({
        type: 'progress',
        event: {
          type: 'completed',
          elapsedMilliseconds: 120,
        },
      }),
      serializeStreamEnvelope({
        type: 'result',
        status: 200,
        body: {
          message: {
            content: '답변',
          },
        },
      }),
    ].join('')
    const encodedStream = new TextEncoder().encode(serializedStream)
    const splitIndex = Math.floor(encodedStream.length / 2)
    let forwardedAcceptHeader: string | null = null
    const fetchImplementationMock = vi.fn(
      async (_input: RequestInfo | URL, requestInit?: RequestInit) => {
        forwardedAcceptHeader = new Headers(requestInit?.headers).get('Accept')

        return new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(encodedStream.slice(0, splitIndex))
              controller.enqueue(encodedStream.slice(splitIndex))
              controller.close()
            },
          }),
          {
            headers: {
              'Content-Type': BLOG_CHAT_PROGRESS_FETCH_TEST.STREAM_CONTENT_TYPE,
            },
          },
        )
      },
    )
    const onRequestStart = vi.fn()
    const onProgress = vi.fn()
    const progressFetch = createBlogChatProgressFetch({
      onRequestStart,
      onProgress,
      fetchImplementation: fetchImplementationMock as typeof fetch,
    })

    const response = await progressFetch(BLOG_CHAT_PROGRESS_FETCH_TEST.ENDPOINT, {
      method: 'POST',
    })

    expect(onRequestStart).toHaveBeenCalledOnce()
    expect(onProgress).toHaveBeenNthCalledWith(1, {
      type: 'stage',
      stage: 'understanding_question',
    })
    expect(onProgress).toHaveBeenNthCalledWith(2, {
      type: 'completed',
      elapsedMilliseconds: 120,
    })
    expect(fetchImplementationMock).toHaveBeenCalledWith(
      BLOG_CHAT_PROGRESS_FETCH_TEST.ENDPOINT,
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    )

    expect(forwardedAcceptHeader).toBe(
      BLOG_CHAT_PROGRESS_FETCH_TEST.STREAM_CONTENT_TYPE,
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      message: {
        content: '답변',
      },
    })
  })

  it('일반 JSON 응답은 변경하지 않고 반환한다', async () => {
    const originalResponse = Response.json({ answer: '답변' })
    const progressFetch = createBlogChatProgressFetch({
      onRequestStart: vi.fn(),
      onProgress: vi.fn(),
      fetchImplementation: vi.fn(
        async () => originalResponse,
      ) as unknown as typeof fetch,
    })

    const response = await progressFetch(BLOG_CHAT_PROGRESS_FETCH_TEST.ENDPOINT)

    expect(response).toBe(originalResponse)
  })
})
