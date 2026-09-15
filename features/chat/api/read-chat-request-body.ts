import { BLOG_CHAT } from '@/features/chat/config/constants'

export class ChatRequestBodyTooLargeError extends Error {
  constructor() {
    super('Chat request body is too large')
    this.name = 'ChatRequestBodyTooLargeError'
  }
}

export async function readChatRequestBody(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get('content-length'))
  if (declaredLength > BLOG_CHAT.INPUT.MAXIMUM_REQUEST_BYTES) {
    await request.body?.cancel()
    throw new ChatRequestBodyTooLargeError()
  }

  const reader = request.body?.getReader()
  if (!reader) {
    throw new SyntaxError('Missing request body')
  }

  const decoder = new TextDecoder()
  let byteCount = 0
  let body = ''
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      byteCount += value.byteLength
      if (byteCount > BLOG_CHAT.INPUT.MAXIMUM_REQUEST_BYTES) {
        await reader.cancel()
        throw new ChatRequestBodyTooLargeError()
      }
      body += decoder.decode(value, { stream: true })
    }
    body += decoder.decode()
    return JSON.parse(body)
  } finally {
    reader.releaseLock()
  }
}
