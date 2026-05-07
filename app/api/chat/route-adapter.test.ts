import type { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const answerBlogChatQuestionMock = vi.fn()

vi.mock('@/features/chat/model/answer-blog-chat-question', () => {
  return {
    answerBlogChatQuestion: answerBlogChatQuestionMock,
  }
})

function createRequest(): NextRequest {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '203.0.113.10',
    },
    body: JSON.stringify({
      question: 'React stack?',
      locale: 'ko',
    }),
  }) as NextRequest
}

describe('POST /api/chat route adapter', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('HTTP 요청 본문과 헤더를 챗봇 application service에 위임한다', async () => {
    answerBlogChatQuestionMock.mockResolvedValueOnce({
      body: {
        answer: 'React와 TypeScript를 사용합니다.',
        citations: [],
        grounded: false,
      },
      status: 200,
    })

    const { POST } = await import('./route')
    const response = await POST(createRequest())

    expect(answerBlogChatQuestionMock).toHaveBeenCalledWith({
      requestBody: {
        question: 'React stack?',
        locale: 'ko',
      },
      requestHeaders: expect.any(Headers),
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      answer: 'React와 TypeScript를 사용합니다.',
      citations: [],
      grounded: false,
    })
  })
})
