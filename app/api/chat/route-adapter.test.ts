import type { NextRequest } from 'next/server'
import { createMockLeeChatRequest } from 'lee-chat-sdk/testing'
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

function createLeeChatRequest(): NextRequest {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '203.0.113.10',
    },
    body: JSON.stringify(
      createMockLeeChatRequest({
        appId: 'leey00nsu-next-blog',
        conversation: {
          id: 'blog-chat:ko',
          kind: 'assistant',
        },
        metadata: {
          locale: 'ko',
          currentPostSlug: 'building-ai-chat-for-my-blog',
        },
        message: {
          id: 'message-id',
          senderId: 'visitor',
          content: 'React stack?',
          parts: [{ type: 'text', text: 'React stack?' }],
          createdAt: '2026-06-05T00:00:00.000Z',
        },
        history: [
          {
            role: 'user',
            senderId: 'visitor',
            content: '이전 질문',
            parts: [{ type: 'text', text: '이전 질문' }],
            createdAt: '2026-06-05T00:00:00.000Z',
          },
          {
            role: 'assistant',
            senderId: 'assistant',
            content: '이전 답변',
            parts: [{ type: 'text', text: '이전 답변' }],
            createdAt: '2026-06-05T00:00:01.000Z',
          },
        ],
      }),
    ),
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

  it('SDK LeeChatRequest를 기존 챗봇 요청으로 변환하고 LeeChatResponse로 응답한다', async () => {
    answerBlogChatQuestionMock.mockResolvedValueOnce({
      body: {
        answer: 'React와 TypeScript를 사용합니다.',
        citations: [],
        grounded: true,
      },
      status: 200,
    })

    const { POST } = await import('./route')
    const response = await POST(createLeeChatRequest())

    expect(answerBlogChatQuestionMock).toHaveBeenCalledWith({
      requestBody: {
        question: 'React stack?',
        locale: 'ko',
        currentPostSlug: 'building-ai-chat-for-my-blog',
        conversationHistory: [
          {
            question: '이전 질문',
            answer: '이전 답변',
            citations: [],
          },
        ],
      },
      requestHeaders: expect.any(Headers),
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      message: {
        id: 'message-id:assistant',
        content: 'React와 TypeScript를 사용합니다.',
        parts: [{ type: 'text', text: 'React와 TypeScript를 사용합니다.' }],
        createdAt: expect.any(String),
        metadata: {
          blogChatResponse: {
            answer: 'React와 TypeScript를 사용합니다.',
            citations: [],
            grounded: true,
          },
        },
      },
    })
  })
})
