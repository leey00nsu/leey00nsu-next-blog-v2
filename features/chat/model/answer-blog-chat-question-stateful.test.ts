import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EMPTY_CHAT_CONVERSATION_STATE } from '@/features/chat/model/chat-conversation-state'

const {
  runStatefulBlogChatPipelineMock,
  planChatQuestionMock,
  recordChatObservabilityEventMock,
} = vi.hoisted(() => {
  return {
    runStatefulBlogChatPipelineMock: vi.fn(),
    planChatQuestionMock: vi.fn(),
    recordChatObservabilityEventMock: vi.fn(),
  }
})

vi.mock('@/features/chat/model/run-stateful-blog-chat-pipeline', () => {
  return {
    runStatefulBlogChatPipeline: runStatefulBlogChatPipelineMock,
  }
})

vi.mock('@/features/chat/api/plan-chat-question', () => {
  return {
    planChatQuestion: planChatQuestionMock,
  }
})

vi.mock('@/features/chat/model/blog-chat-usage-limiter', () => {
  return {
    resolveBlogChatClientKey: () => 'client',
    consumeBlogChatRequestRateLimit: () => ({ allowed: true }),
    acquireBlogChatConcurrentRequestSlot: () => ({ allowed: true }),
    releaseBlogChatConcurrentRequestSlot: vi.fn(),
    consumeBlogChatDailyUsage: () => ({ allowed: true }),
  }
})

vi.mock('@/features/chat/model/blog-chat-response-cache', () => {
  return {
    cleanupExpiredBlogChatResponseCache: vi.fn(),
    getCachedBlogChatResponse: vi.fn(),
    setCachedBlogChatResponse: vi.fn(),
  }
})

vi.mock('@/features/chat/model/chat-observability', () => {
  return {
    recordChatObservabilityEvent: recordChatObservabilityEventMock,
  }
})

vi.mock('@/features/chat/model/get-chat-assistant-profile', () => {
  return {
    getChatAssistantProfile: () => null,
  }
})

vi.mock('@/features/chat/model/get-chat-contact-profile', () => {
  return {
    getChatContactProfile: () => null,
  }
})

describe('answerBlogChatQuestion stateful pipeline', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.BLOG_CHAT_STATEFUL_RAG_ENABLED = 'true'
    runStatefulBlogChatPipelineMock.mockResolvedValue({
      applicationResponse: {
        response: {
          answer: '최신 글은 2026년 4월 21일에 게시된 최신 글입니다.',
          grounded: true,
          citations: [],
        },
        conversationState: {
          ...EMPTY_CHAT_CONVERSATION_STATE,
          temporalConstraint: { order: 'latest' },
          requestedFields: ['title', 'published_at'],
          evidenceScope: 'corpus',
          lastResolvedQuestion: '최신 글은 언제 게시되었나요?',
        },
      },
      intent: {
        standaloneQuestion: '최신 글은 언제 게시되었나요?',
        operation: 'answer',
        target: {
          kind: 'none',
          sourceCategory: null,
          slug: null,
          title: null,
        },
        temporalConstraint: { order: 'latest' },
        requestedFields: ['title', 'published_at'],
        evidenceScope: 'corpus',
        requiredConcepts: [],
        optionalConcepts: [],
        missingSlots: [],
        clarificationQuestion: null,
        confidence: 'high',
        reason: 'Latest post date.',
      },
      execution: null,
      cacheKind: 'none',
      plannerFailureKind: null,
    })
  })

  afterEach(() => {
    delete process.env.BLOG_CHAT_STATEFUL_RAG_ENABLED
  })

  it('feature flag가 켜지면 stateful response envelope을 반환한다', async () => {
    const { answerBlogChatQuestion } = await import(
      '@/features/chat/model/answer-blog-chat-question'
    )
    const result = await answerBlogChatQuestion({
      requestBody: {
        question: '마지막 글 언제야?',
        locale: 'ko',
        conversationState: EMPTY_CHAT_CONVERSATION_STATE,
      },
      requestHeaders: new Headers(),
    })

    expect(runStatefulBlogChatPipelineMock).toHaveBeenCalledOnce()
    expect(planChatQuestionMock).not.toHaveBeenCalled()
    expect(result.body).toMatchObject({
      response: {
        answer: '최신 글은 2026년 4월 21일에 게시된 최신 글입니다.',
      },
      conversationState: {
        requestedFields: ['title', 'published_at'],
      },
    })
  })
})
