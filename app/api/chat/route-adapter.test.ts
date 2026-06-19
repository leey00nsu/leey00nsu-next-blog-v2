import type { NextRequest } from 'next/server'
import { createMockLeeChatRequest } from 'lee-chat-sdk/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EMPTY_CHAT_CONVERSATION_STATE } from '@/features/chat/model/chat-conversation-state'

const answerBlogChatQuestionMock = vi.fn()

const PENDING_OWNER_CLARIFICATION_STATE = {
  ...EMPTY_CHAT_CONVERSATION_STATE,
  pendingClarification: {
    clarificationQuestion: '누구를 가리키는지 알려주세요.',
    suspendedQueryPlan: {
      standaloneQuestion: '이 사람이 Vercel을 사용했나요?',
      contextAction: 'reset' as const,
      targetSelection: { kind: 'none' as const },
      operation: 'lookup' as const,
      sourceSelection: { mode: 'all' as const },
      temporalSelection: { mode: 'none' as const },
      requestedFields: ['content' as const],
      requiredConcepts: ['Vercel'],
      optionalConcepts: [],
      missingSlots: ['target' as const],
      clarificationQuestion: '누구를 가리키는지 알려주세요.',
      confidence: 'low' as const,
      reason: 'The target is missing.',
    },
  },
}

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

function createLeeChatRequestWithAssistantMetadata(): NextRequest {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '203.0.113.10',
    },
    body: JSON.stringify({
      appId: 'leey00nsu-next-blog',
      conversation: {
        id: 'blog-chat:ko',
        kind: 'assistant',
      },
      participant: {
        id: 'visitor',
        kind: 'user',
      },
      visitor: {
        id: 'visitor',
      },
      metadata: {
        locale: 'ko',
      },
      message: {
        id: 'message-id',
        senderId: 'visitor',
        content: '블로그 주인',
        parts: [{ type: 'text', text: '블로그 주인' }],
        createdAt: '2026-06-05T00:00:02.000Z',
      },
      history: [
        {
          role: 'user',
          senderId: 'visitor',
          content: '이 사람이 Vercel 써봤냐고',
          parts: [{ type: 'text', text: '이 사람이 Vercel 써봤냐고' }],
          createdAt: '2026-06-05T00:00:00.000Z',
        },
        {
          role: 'assistant',
          senderId: 'assistant',
          content: '누구를 가리키는지 알려주세요.',
          parts: [{ type: 'text', text: '누구를 가리키는지 알려주세요.' }],
          createdAt: '2026-06-05T00:00:01.000Z',
          metadata: {
            conversationState: PENDING_OWNER_CLARIFICATION_STATE,
            blogChatResponse: {
              answer: '누구를 가리키는지 알려주세요.',
              grounded: true,
              citations: [
                {
                  title: 'About Me',
                  url: '/ko/about',
                  sectionTitle: null,
                  sourceCategory: 'profile',
                },
              ],
            },
          },
        },
      ],
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
        conversationState: EMPTY_CHAT_CONVERSATION_STATE,
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
          conversationState: EMPTY_CHAT_CONVERSATION_STATE,
          blogChatResponse: {
            answer: 'React와 TypeScript를 사용합니다.',
            citations: [],
            grounded: true,
          },
        },
      },
    })
  })

  it('SDK assistant metadata의 blogChatResponse citations를 대화 이력에 보존한다', async () => {
    answerBlogChatQuestionMock.mockResolvedValueOnce({
      body: {
        answer: '이윤수는 Vercel 사용 경험이 있습니다.',
        citations: [],
        grounded: true,
      },
      status: 200,
    })

    const { POST } = await import('./route')

    await POST(createLeeChatRequestWithAssistantMetadata())

    expect(answerBlogChatQuestionMock).toHaveBeenCalledWith({
      requestBody: expect.objectContaining({
        question: '블로그 주인',
        conversationHistory: [
          {
            question: '이 사람이 Vercel 써봤냐고',
            answer: '누구를 가리키는지 알려주세요.',
            citations: [
              {
                title: 'About Me',
                url: '/ko/about',
                sectionTitle: null,
                sourceCategory: 'profile',
              },
            ],
          },
        ],
        conversationState: PENDING_OWNER_CLARIFICATION_STATE,
      }),
      requestHeaders: expect.any(Headers),
    })
  })
})
