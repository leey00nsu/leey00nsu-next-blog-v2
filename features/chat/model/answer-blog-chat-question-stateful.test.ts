import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EMPTY_CHAT_CONVERSATION_STATE } from '@/features/chat/model/chat-conversation-state'

const { runChatWorkflowMock, recordChatObservabilityEventMock } =
  vi.hoisted(() => {
    return {
      runChatWorkflowMock: vi.fn(),
      recordChatObservabilityEventMock: vi.fn(),
    }
  })

vi.mock('@/features/chat/model/chat-workflow', () => {
  return {
    runChatWorkflow: runChatWorkflowMock,
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
    runChatWorkflowMock.mockResolvedValue({
      applicationResponse: {
        response: {
          answer: '최신 글은 2026년 4월 21일에 게시된 최신 글입니다.',
          grounded: true,
          citations: [],
        },
        conversationState: {
          ...EMPTY_CHAT_CONVERSATION_STATE,
          lastQueryPlan: {
            standaloneQuestion: '최신 글은 언제 게시되었나요?',
            contextAction: 'reset',
            targetSelection: { kind: 'none' },
            operation: 'lookup',
            sourceSelection: { mode: 'only', categories: ['blog'] },
            temporalSelection: { mode: 'single', order: 'latest' },
            requestedFields: ['title', 'published_at'],
            requiredConcepts: [],
            optionalConcepts: [],
            missingSlots: [],
            clarificationQuestion: null,
            confidence: 'high',
            reason: 'Latest post date.',
          },
        },
      },
      queryPlan: {
        standaloneQuestion: '최신 글은 언제 게시되었나요?',
        contextAction: 'reset',
        targetSelection: { kind: 'none' },
        operation: 'explain',
        sourceSelection: { mode: 'only', categories: ['project'] },
        temporalSelection: { mode: 'rank', order: 'latest' },
        requestedFields: ['title', 'published_at'],
        requiredConcepts: [],
        optionalConcepts: [],
        missingSlots: [],
        clarificationQuestion: null,
        confidence: 'high',
        reason: 'Latest post date.',
      },
      retrievalPlan: {
        executionKind: 'retrieve_and_generate',
        standaloneQuestion: '최신 글은 언제 게시되었나요?',
        operation: 'explain',
        canonicalTargets: [],
        sourceStrategy: 'only',
        sourceCategories: ['project'],
        requiredConcepts: [],
        optionalConcepts: [],
        requestedFields: ['title', 'published_at'],
        temporalStrategy: 'rank',
        temporalOrder: 'latest',
        maximumEvidenceCount: 3,
      },
      execution: {
        kind: 'evidence',
        matches: [],
        lexicalMatches: [],
        semanticMatches: [],
        reranked: false,
      },
      cacheKind: 'none',
      failureKind: null,
      graphPath: [
        'resolve-context',
        'plan-query',
        'compile-plan',
        'retrieve-evidence',
        'finalize',
      ],
    })
  })

  it('stateful response envelope을 반환한다', async () => {
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

    expect(runChatWorkflowMock).toHaveBeenCalledOnce()
    expect(result.body).toMatchObject({
      response: {
        answer: '최신 글은 2026년 4월 21일에 게시된 최신 글입니다.',
      },
      conversationState: {
        version: 2,
        lastQueryPlan: {
          requestedFields: ['title', 'published_at'],
        },
      },
    })
    expect(recordChatObservabilityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryOperation: 'explain',
        sourceStrategy: 'only',
        sourceCategories: ['project'],
        temporalStrategy: 'rank',
        temporalOrder: 'latest',
        executionKind: 'retrieve_and_generate',
        graphPath: expect.arrayContaining([
          'compile-plan',
          'retrieve-evidence',
        ]),
      }),
    )
  })
})
