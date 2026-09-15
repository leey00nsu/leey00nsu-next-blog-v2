import { describe, expect, it, vi } from 'vitest'
import { BLOG_CHAT } from '@/features/chat/config/constants'
import {
  ChatRequestBodyTooLargeError,
  readChatRequestBody,
} from './read-chat-request-body'

function streamRequest(body: ReadableStream<Uint8Array>): Request {
  return { headers: new Headers(), body } as Request
}

describe('readChatRequestBody', () => {
  it('여러 청크의 실제 바이트를 누적하고 초과 시 스트림을 취소한다', async () => {
    const cancel = vi.fn()
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new Uint8Array(BLOG_CHAT.INPUT.MAXIMUM_REQUEST_BYTES),
        )
        controller.enqueue(new Uint8Array(1))
      },
      cancel,
    })
    await expect(
      readChatRequestBody(streamRequest(body)),
    ).rejects.toBeInstanceOf(ChatRequestBodyTooLargeError)
    expect(cancel).toHaveBeenCalledOnce()
    expect(body.locked).toBe(false)
  })

  it('청크 사이에서 나뉜 UTF-8 문자를 보존한다', async () => {
    const input = { question: '한글 질문' }
    const bytes = new TextEncoder().encode(JSON.stringify(input))
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const byte of bytes) controller.enqueue(new Uint8Array([byte]))
        controller.close()
      },
    })
    await expect(readChatRequestBody(streamRequest(body))).resolves.toEqual(
      input,
    )
  })
})
