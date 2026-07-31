'use client'

import { z } from 'zod'
import {
  BlogChatProgressEventSchema,
  type BlogChatProgressEvent,
} from '@/features/chat/model/blog-chat-progress'

const BLOG_CHAT_PROGRESS_STREAM = {
  ACCEPT_HEADER: 'text/event-stream',
  CONTENT_TYPE_HEADER: 'content-type',
  EVENT_SEPARATOR: '\n\n',
  DATA_PREFIX: 'data:',
  RESPONSE_CONTENT_TYPE: 'application/json',
  DEFAULT_RESPONSE_STATUS: 200,
} as const

const BlogChatProgressStreamEnvelopeSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('progress'),
    event: BlogChatProgressEventSchema,
  }),
  z.object({
    type: z.literal('result'),
    status: z.number().int(),
    body: z.unknown(),
  }),
])

interface CreateBlogChatProgressFetchParams {
  onRequestStart: () => void
  onProgress: (event: BlogChatProgressEvent) => void
  fetchImplementation?: typeof fetch
}

interface BlogChatProgressStreamResult {
  status: number
  body: unknown
}

function parseProgressStreamEnvelope(eventBlock: string) {
  const serializedData = eventBlock
    .split('\n')
    .filter((line) => line.startsWith(BLOG_CHAT_PROGRESS_STREAM.DATA_PREFIX))
    .map((line) => {
      return line.slice(BLOG_CHAT_PROGRESS_STREAM.DATA_PREFIX.length).trimStart()
    })
    .join('\n')

  if (!serializedData) {
    return null
  }

  try {
    return BlogChatProgressStreamEnvelopeSchema.safeParse(
      JSON.parse(serializedData),
    )
  } catch {
    return null
  }
}

async function consumeBlogChatProgressStream(params: {
  response: Response
  onProgress: (event: BlogChatProgressEvent) => void
}): Promise<BlogChatProgressStreamResult> {
  if (!params.response.body) {
    throw new Error('The blog chat progress stream has no response body.')
  }

  const streamReader = params.response.body.getReader()
  const textDecoder = new TextDecoder()
  let bufferedText = ''
  let streamResult: BlogChatProgressStreamResult | null = null

  while (true) {
    const readResult = await streamReader.read()

    bufferedText += readResult.done
      ? textDecoder.decode()
      : textDecoder.decode(readResult.value, { stream: true })

    let separatorIndex = bufferedText.indexOf(
      BLOG_CHAT_PROGRESS_STREAM.EVENT_SEPARATOR,
    )

    while (separatorIndex >= 0) {
      const eventBlock = bufferedText.slice(0, separatorIndex)
      bufferedText = bufferedText.slice(
        separatorIndex + BLOG_CHAT_PROGRESS_STREAM.EVENT_SEPARATOR.length,
      )
      const parsedEnvelope = parseProgressStreamEnvelope(eventBlock)

      if (parsedEnvelope?.success) {
        if (parsedEnvelope.data.type === 'progress') {
          params.onProgress(parsedEnvelope.data.event)
        } else {
          streamResult = {
            status: parsedEnvelope.data.status,
            body: parsedEnvelope.data.body,
          }
        }
      }

      separatorIndex = bufferedText.indexOf(
        BLOG_CHAT_PROGRESS_STREAM.EVENT_SEPARATOR,
      )
    }

    if (readResult.done) {
      break
    }
  }

  if (!streamResult) {
    throw new Error('The blog chat progress stream ended without a result.')
  }

  return streamResult
}

export function createBlogChatProgressFetch({
  onRequestStart,
  onProgress,
  fetchImplementation = fetch,
}: CreateBlogChatProgressFetchParams): typeof fetch {
  return async (input, requestInit) => {
    const requestHeaders = new Headers(
      requestInit?.headers ??
        (input instanceof Request ? input.headers : undefined),
    )
    requestHeaders.set('Accept', BLOG_CHAT_PROGRESS_STREAM.ACCEPT_HEADER)
    onRequestStart()

    const response = await fetchImplementation(input, {
      ...requestInit,
      headers: requestHeaders,
    })
    const responseContentType =
      response.headers.get(BLOG_CHAT_PROGRESS_STREAM.CONTENT_TYPE_HEADER) ?? ''

    if (
      !responseContentType.includes(BLOG_CHAT_PROGRESS_STREAM.ACCEPT_HEADER)
    ) {
      return response
    }

    const streamResult = await consumeBlogChatProgressStream({
      response,
      onProgress,
    })

    return new Response(JSON.stringify(streamResult.body), {
      status:
        streamResult.status || BLOG_CHAT_PROGRESS_STREAM.DEFAULT_RESPONSE_STATUS,
      headers: {
        'Content-Type': BLOG_CHAT_PROGRESS_STREAM.RESPONSE_CONTENT_TYPE,
      },
    })
  }
}
