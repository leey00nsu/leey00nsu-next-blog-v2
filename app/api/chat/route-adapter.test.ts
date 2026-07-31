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

function createLeeChatProgressRequest(): NextRequest {
  const request = createLeeChatRequest()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('Accept', 'text/event-stream')

  return new Request(request, {
    headers: requestHeaders,
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

function createLeeChatRequestWithRefusalHistory(): NextRequest {
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
        content: '최근 어디에서 일했어?',
        parts: [{ type: 'text', text: '최근 어디에서 일했어?' }],
        createdAt: '2026-06-05T00:00:02.000Z',
      },
      history: [
        {
          role: 'user',
          senderId: 'visitor',
          content: '구직중이야?',
          parts: [{ type: 'text', text: '구직중이야?' }],
          createdAt: '2026-06-05T00:00:00.000Z',
        },
        {
          role: 'assistant',
          senderId: 'assistant',
          content: '공개된 정보에서는 확인할 수 없어요.',
          parts: [
            {
              type: 'text',
              text: '공개된 정보에서는 확인할 수 없어요.',
            },
          ],
          createdAt: '2026-06-05T00:00:01.000Z',
          metadata: {
            blogChatResponse: {
              answer: '공개된 정보에서는 확인할 수 없어요.',
              citations: [],
              grounded: false,
              refusalReason: 'insufficient_search_match',
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

  it('진행 스트림 요청에는 실제 단계와 최종 SDK 응답을 순서대로 전송한다', async () => {
    answerBlogChatQuestionMock.mockImplementationOnce(
      async ({
        reportProgress,
      }: {
        reportProgress: (event: unknown) => void
      }) => {
        reportProgress({
          type: 'step',
          step: {
            id: 'understanding_question',
            label: '질문의 대상과 범위를 확인하고 있어요',
          },
        })
        reportProgress({
          type: 'step',
          step: {
            id: 'checking_sources',
            label: '공개된 자료를 확인하고 있어요',
          },
        })

        return {
          body: {
            answer: 'React와 TypeScript를 사용합니다.',
            citations: [
              {
                title: 'About Me',
                url: '/ko/about',
                sectionTitle: null,
                sourceCategory: 'profile',
              },
            ],
            grounded: true,
          },
          status: 200,
        }
      },
    )

    const { POST } = await import('./route')
    const response = await POST(createLeeChatProgressRequest())
    const serializedStream = await response.text()
    const envelopes = serializedStream
      .split('\n')
      .filter((line) => line.startsWith('data: '))
      .map((line) => JSON.parse(line.slice('data: '.length)))

    expect(response.headers.get('Content-Type')).toContain('text/event-stream')
    expect(envelopes).toEqual([
      {
        version: 1,
        type: 'progress',
        data: {
          type: 'step',
          step: {
            id: 'understanding_question',
            label: '질문의 대상과 범위를 확인하고 있어요',
          },
        },
      },
      {
        version: 1,
        type: 'progress',
        data: {
          type: 'step',
          step: {
            id: 'checking_sources',
            label: '공개된 자료를 확인하고 있어요',
          },
        },
      },
      {
        version: 1,
        type: 'progress',
        data: {
          type: 'references',
          references: [
            {
              id: '/ko/about',
              label: 'About Me',
              href: '/ko/about',
            },
          ],
        },
      },
      {
        version: 1,
        type: 'progress',
        data: {
          type: 'completed',
          elapsedMilliseconds: expect.any(Number),
        },
      },
      {
        version: 1,
        type: 'result',
        data: {
          message: {
            id: 'message-id:assistant',
            content: 'React와 TypeScript를 사용합니다.',
            parts: [
              {
                type: 'text',
                text: 'React와 TypeScript를 사용합니다.',
              },
            ],
            createdAt: expect.any(String),
            metadata: {
              conversationState: EMPTY_CHAT_CONVERSATION_STATE,
              blogChatResponse: {
                answer: 'React와 TypeScript를 사용합니다.',
                citations: [
                  {
                    title: 'About Me',
                    url: '/ko/about',
                    sectionTitle: null,
                    sourceCategory: 'profile',
                  },
                ],
                grounded: true,
              },
            },
          },
        },
      },
    ])
  })

  it('stream 시작 후 application 오류는 완료가 아닌 terminal error로 전송한다', async () => {
    answerBlogChatQuestionMock.mockResolvedValueOnce({
      body: {
        error: 'internal error',
      },
      status: 500,
    })

    const { POST } = await import('./route')
    const response = await POST(createLeeChatProgressRequest())
    const serializedStream = await response.text()
    const envelopes = serializedStream
      .split('\n')
      .filter((line) => line.startsWith('data: '))
      .map((line) => JSON.parse(line.slice('data: '.length)))

    expect(envelopes).toEqual([
      {
        version: 1,
        type: 'error',
        error: {
          code: 'blog_chat_request_failed',
          message:
            '답변을 준비하는 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.',
          status: 500,
          retryable: false,
        },
      },
    ])
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

  it('refusal 응답은 다음 질문의 플래너 대화 이력에서 제외한다', async () => {
    answerBlogChatQuestionMock.mockResolvedValueOnce({
      body: {
        answer: '가장 최근 근무처는 Ecount ERP입니다.',
        citations: [],
        grounded: true,
      },
      status: 200,
    })

    const { POST } = await import('./route')

    await POST(createLeeChatRequestWithRefusalHistory())

    expect(answerBlogChatQuestionMock).toHaveBeenCalledWith({
      requestBody: expect.objectContaining({
        question: '최근 어디에서 일했어?',
        conversationHistory: [],
      }),
      requestHeaders: expect.any(Headers),
    })
  })

  it('근거 없음 refusal을 HTTP 200의 사용자 메시지로 변환한다', async () => {
    answerBlogChatQuestionMock.mockResolvedValueOnce({
      body: {
        response: {
          answer: '공개된 정보에서는 확인할 수 없어요.',
          citations: [],
          grounded: false,
          refusalReason: 'insufficient_search_match',
        },
        conversationState: EMPTY_CHAT_CONVERSATION_STATE,
      },
      status: 200,
    })

    const { POST } = await import('./route')
    const response = await POST(createLeeChatRequest())
    const responseBody = await response.json()

    expect(response.status).toBe(200)
    expect(responseBody).toMatchObject({
      message: {
        content: '공개된 정보에서는 확인할 수 없어요.',
        parts: [{ type: 'text', text: '공개된 정보에서는 확인할 수 없어요.' }],
        metadata: {
          blogChatResponse: {
            answer: '공개된 정보에서는 확인할 수 없어요.',
            citations: [],
            grounded: false,
            refusalReason: 'insufficient_search_match',
          },
        },
      },
    })
  })
})
