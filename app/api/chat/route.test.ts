import type { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const analyzeQuestionMock = vi.fn()
const answerBlogQuestionMock = vi.fn()
const shouldCacheBlogChatResponseMock = vi.fn()
const finalizeBlogChatResponseMock = vi.fn()
const resolveChatRequestMock = vi.fn()
const getCuratedChatSourcesMock = vi.fn()
const planChatQuestionMock = vi.fn()
const runChatRagWorkflowMock = vi.fn()
const getChatAssistantProfileMock = vi.fn()
const getChatContactProfileMock = vi.fn()
const resolveChatClientKeyMock = vi.fn()
const consumeChatRequestRateLimitMock = vi.fn()
const acquireChatConcurrentRequestSlotMock = vi.fn()
const releaseChatConcurrentRequestSlotMock = vi.fn()
const findSemanticCachedBlogChatResponseMock = vi.fn()
const storeSemanticCachedBlogChatResponseMock = vi.fn()
const recordChatObservabilityEventMock = vi.fn()
const rerankChatEvidenceMock = vi.fn()

vi.mock('@/entities/post/config/blog-search-records.generated', () => {
  return {
    GENERATED_BLOG_SEARCH_RECORDS: {
      ko: [],
      en: [],
    },
  }
})

vi.mock('@/features/chat/config/constants', () => {
  return {
    BLOG_CHAT: {
      INPUT: {
        MAXIMUM_QUESTION_CHARACTERS: 200,
      },
      SEARCH: {
        TOP_K: 3,
        MAXIMUM_MATCHES_PER_SLUG: 2,
        MINIMUM_MATCHED_TOKEN_COUNT: 2,
        SOURCE_CATEGORY_BOOST: 4,
        EXACT_TITLE_MATCH_BOOST: 5,
        MINIMUM_SCORE: 6,
        FIELD_SCORE: {
          TITLE: 4,
          SECTION: 5,
          CONTENT: 3,
          TAG: 2,
        },
      },
      PROMPT: {
        MAXIMUM_CONTEXT_RECORD_COUNT: 3,
        MAXIMUM_CONTEXT_CHARACTERS: 2400,
        MAXIMUM_QUESTION_CHARACTERS: 400,
      },
      CACHE: {
        TTL_MILLISECONDS: 5 * 60 * 1000,
      },
      SEMANTIC_CACHE: {
        TTL_MILLISECONDS: 10 * 60 * 1000,
        MAXIMUM_ENTRY_COUNT: 100,
        MINIMUM_SIMILARITY_SCORE: 0.92,
      },
      RERANK: {
        MAXIMUM_CANDIDATE_COUNT: 5,
        LONG_QUESTION_MINIMUM_LENGTH: 36,
        MINIMUM_MATCH_COUNT: 2,
        MODEL_ID: 'gpt-5.4-mini',
      },
      FOLLOW_UP: {
        MAXIMUM_SUGGESTION_COUNT: 3,
      },
      OBSERVABILITY: {
        MAXIMUM_LOGGED_MATCH_COUNT: 5,
      },
      RATE_LIMIT: {
        WINDOW_MILLISECONDS: 60 * 1000,
        MAXIMUM_REQUESTS_PER_WINDOW: 5,
        MAXIMUM_CONCURRENT_REQUESTS: 1,
      },
      LIMIT: {
        MAXIMUM_DAILY_REQUESTS: 1,
      },
    },
  }
})

vi.mock('@/features/chat/lib/question-analysis', () => {
  return {
    analyzeQuestion: analyzeQuestionMock,
    normalizeQuestion: (question: string) => {
      return question
        .trim()
        .replaceAll(/[?!,]+/g, ' ')
        .replaceAll(/\s+/g, ' ')
        .trim()
    },
  }
})

vi.mock('@/features/chat/api/answer-blog-question', () => {
  return {
    answerBlogQuestion: answerBlogQuestionMock,
  }
})

vi.mock('@/features/chat/lib/blog-chat-cache', () => {
  return {
    shouldCacheBlogChatResponse: shouldCacheBlogChatResponseMock,
  }
})

vi.mock('@/features/chat/lib/blog-chat-response', () => {
  return {
    finalizeBlogChatResponse: finalizeBlogChatResponseMock,
  }
})

vi.mock('@/features/chat/lib/resolve-chat-request', () => {
  return {
    resolveChatRequest: resolveChatRequestMock,
  }
})

vi.mock('@/features/chat/api/plan-chat-question', () => {
  return {
    planChatQuestion: planChatQuestionMock,
  }
})

vi.mock('@/features/chat/model/chat-rag-workflow', () => {
  return {
    runChatRagWorkflow: runChatRagWorkflowMock,
  }
})

vi.mock('@/features/chat/model/get-curated-chat-sources', () => {
  return {
    getCuratedChatSources: getCuratedChatSourcesMock,
  }
})

vi.mock('@/features/chat/model/get-chat-assistant-profile', () => {
  return {
    getChatAssistantProfile: getChatAssistantProfileMock,
  }
})

vi.mock('@/features/chat/model/get-chat-contact-profile', () => {
  return {
    getChatContactProfile: getChatContactProfileMock,
  }
})

vi.mock('@/features/chat/lib/chat-rate-limit', () => {
  return {
    resolveChatClientKey: resolveChatClientKeyMock,
    consumeChatRequestRateLimit: consumeChatRequestRateLimitMock,
    acquireChatConcurrentRequestSlot: acquireChatConcurrentRequestSlotMock,
    releaseChatConcurrentRequestSlot: releaseChatConcurrentRequestSlotMock,
  }
})

vi.mock('@/features/chat/model/chat-semantic-cache', () => {
  return {
    findSemanticCachedBlogChatResponse: findSemanticCachedBlogChatResponseMock,
    storeSemanticCachedBlogChatResponse:
      storeSemanticCachedBlogChatResponseMock,
  }
})

vi.mock('@/features/chat/model/chat-observability', () => {
  return {
    recordChatObservabilityEvent: recordChatObservabilityEventMock,
  }
})

vi.mock('@/features/chat/api/rerank-chat-evidence', () => {
  return {
    rerankChatEvidence: rerankChatEvidenceMock,
  }
})

const GROUNDED_RESPONSE = {
  answer: 'React와 TypeScript를 사용합니다.',
  citations: [
    {
      title: 'About Me',
      url: '/ko/about',
      sectionTitle: null,
      sourceCategory: 'profile' as const,
    },
  ],
  grounded: true,
}

const SOCIAL_RESPONSE = {
  answer: '안녕하세요. 무엇을 찾고 계신가요?',
  citations: [],
  grounded: false,
}

const CLARIFICATION_RESPONSE = {
  answer: '누구를 가리키는지 조금 더 구체적으로 적어주세요.',
  citations: [],
  grounded: false,
}

const DAILY_LIMIT_EXCEEDED_RESPONSE = {
  answer: '',
  citations: [],
  grounded: false,
  refusalReason: 'daily_limit_exceeded',
} as const
const RATE_LIMITED_RESPONSE = {
  answer: '',
  citations: [],
  grounded: false,
  refusalReason: 'rate_limited',
} as const

const DEFAULT_ANALYSIS_RESULT = {
  normalizedQuestion: 'react stack',
  questionType: 'general' as const,
  searchQueries: [],
}

const DEFAULT_QUESTION_PLAN = {
  standaloneQuestion: 'React stack',
  socialPreamble: false,
  action: 'answer' as const,
  scope: 'global' as const,
  deterministicAction: 'none' as const,
  needsRetrieval: true,
  retrievalMode: 'standard' as const,
  preferredSourceCategories: [] as const,
  additionalKeywords: [] as const,
  needsClarification: false,
  clarificationQuestion: null,
  reason: 'default retrieval',
}
const DEFAULT_QUESTION_PLAN_RESULT = {
  ok: true as const,
  questionPlan: DEFAULT_QUESTION_PLAN,
}

function createChatRequest(
  question: string,
  overrides?: Record<string, unknown>,
  headerOverrides?: Record<string, string>,
): NextRequest {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headerOverrides,
    },
    body: JSON.stringify({
      question,
      locale: 'ko',
      ...overrides,
    }),
  }) as NextRequest
}

async function importRouteModule() {
  return import('./route')
}

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    getCuratedChatSourcesMock.mockResolvedValue([])
    getChatAssistantProfileMock.mockReturnValue({
      chatbotName: '블로그 챗봇',
      ownerName: '이윤수',
      greetingAnswer: SOCIAL_RESPONSE.answer,
      identityAnswer:
        '저는 이윤수 님의 챗봇으로, 블로그 글과 공개된 소개 페이지를 근거로 답변하고 있어요.',
      aliases: ['이 사람 챗봇'],
      content: '챗봇 소개',
    })
    getChatContactProfileMock.mockReturnValue({
      title: 'About Me',
      aboutUrl: '/ko/about',
      methods: [],
    })
    resolveChatClientKeyMock.mockReturnValue('127.0.0.1')
    consumeChatRequestRateLimitMock.mockReturnValue({
      allowed: true,
      currentCount: 1,
      resetAt: Date.now() + 60_000,
    })
    acquireChatConcurrentRequestSlotMock.mockReturnValue({
      allowed: true,
      currentCount: 1,
    })
    shouldCacheBlogChatResponseMock.mockReturnValue(true)
    finalizeBlogChatResponseMock.mockReturnValue(GROUNDED_RESPONSE)
    planChatQuestionMock.mockResolvedValue(DEFAULT_QUESTION_PLAN_RESULT)
    runChatRagWorkflowMock.mockResolvedValue({
      grounded: false,
      matches: [],
    })
    analyzeQuestionMock.mockReturnValue(DEFAULT_ANALYSIS_RESULT)
    findSemanticCachedBlogChatResponseMock.mockImplementation(async () => {})
    storeSemanticCachedBlogChatResponseMock.mockImplementation(async () => {})
    recordChatObservabilityEventMock.mockImplementation(async () => {})
    rerankChatEvidenceMock.mockResolvedValue(
      resolveChatRequestMock.mock.results[0]?.value?.matches ?? [],
    )
    resolveChatRequestMock.mockReturnValue({
      normalizedQuestion: 'react stack',
      questionType: 'general',
      shouldCallModel: true,
      matches: [
        {
          id: 'ko/about/profile',
          locale: 'ko',
          slug: 'about',
          title: 'About Me',
          url: '/ko/about',
          excerpt: 'React와 TypeScript를 사용합니다.',
          content: 'React와 TypeScript를 사용합니다.',
          sectionTitle: null,
          tags: ['react', 'typescript'],
          sourceCategory: 'profile' as const,
        },
      ],
    })
    answerBlogQuestionMock.mockResolvedValue({
      ok: true,
      draftAnswer: {
        answer: GROUNDED_RESPONSE.answer,
        usedCitationUrls: ['/ko/about'],
        refusalReason: null,
      },
    })
  })

  it('planner 기반 direct social reply도 일일 quota를 소모한다', async () => {
    planChatQuestionMock.mockResolvedValueOnce({
      ok: true,
      questionPlan: {
        ...DEFAULT_QUESTION_PLAN,
        standaloneQuestion: '안녕',
        deterministicAction: 'social_reply',
        needsRetrieval: false,
        retrievalMode: 'none',
        reason: 'pure social',
      },
    })
    shouldCacheBlogChatResponseMock.mockReturnValueOnce(false)

    const { POST } = await importRouteModule()

    const greetingResponse = await POST(createChatRequest('안녕'))
    const groundedResponse = await POST(createChatRequest('React stack?'))

    expect(await greetingResponse.json()).toEqual(SOCIAL_RESPONSE)
    expect(await groundedResponse.json()).toEqual(DAILY_LIMIT_EXCEEDED_RESPONSE)
    expect(planChatQuestionMock).toHaveBeenCalledTimes(1)
    expect(answerBlogQuestionMock).not.toHaveBeenCalled()
    expect(releaseChatConcurrentRequestSlotMock).toHaveBeenCalledTimes(2)
  })

  it('캐시 응답도 quota를 소모한다', async () => {
    const { POST } = await importRouteModule()

    const firstResponse = await POST(createChatRequest('React stack?'))
    const secondResponse = await POST(createChatRequest('React stack?'))

    expect(await firstResponse.json()).toEqual(
      expect.objectContaining(GROUNDED_RESPONSE),
    )
    expect(await secondResponse.json()).toEqual(DAILY_LIMIT_EXCEEDED_RESPONSE)
    expect(planChatQuestionMock).toHaveBeenCalledTimes(1)
    expect(answerBlogQuestionMock).toHaveBeenCalledTimes(1)
    expect(releaseChatConcurrentRequestSlotMock).toHaveBeenCalledTimes(2)
  })

  it('semantic cache hit이면 retrieval과 모델 호출을 건너뛴다', async () => {
    findSemanticCachedBlogChatResponseMock.mockResolvedValueOnce(
      GROUNDED_RESPONSE,
    )

    const { POST } = await importRouteModule()
    const response = await POST(createChatRequest('React stack?'))

    expect(await response.json()).toEqual(
      expect.objectContaining({
        answer: GROUNDED_RESPONSE.answer,
      }),
    )
    expect(resolveChatRequestMock).not.toHaveBeenCalled()
    expect(answerBlogQuestionMock).not.toHaveBeenCalled()
  })

  it('mixed intent follow-up 질문은 planner의 standalone question으로 분석하고 모델 호출한다', async () => {
    planChatQuestionMock.mockResolvedValueOnce({
      ok: true,
      questionPlan: {
        ...DEFAULT_QUESTION_PLAN,
        standaloneQuestion:
          '대표 프로젝트가 뭐야 lee-spec-kit 그건 왜 그렇게 했어',
        socialPreamble: true,
        preferredSourceCategories: ['project'],
        additionalKeywords: ['lee-spec-kit'],
        reason: 'follow-up retrieval',
      },
    })
    analyzeQuestionMock.mockReturnValueOnce({
      normalizedQuestion:
        '대표 프로젝트가 뭐야 lee-spec-kit 그건 왜 그렇게 했어',
      questionType: 'general',
      searchQueries: [
        {
          question: '대표 프로젝트가 뭐야 lee-spec-kit 그건 왜 그렇게 했어',
          intent: 'general',
          additionalKeywords: [],
          preferredSourceCategories: [],
        },
      ],
    })

    const { POST } = await importRouteModule()

    await POST(
      createChatRequest('안녕 그건 왜 그렇게 했어?', {
        conversationHistory: [
          {
            question: '대표 프로젝트가 뭐야?',
            answer: 'lee-spec-kit이 대표 프로젝트입니다.',
            citations: [
              {
                title: 'lee-spec-kit',
                url: '/ko/projects/lee-spec-kit',
                sectionTitle: null,
                sourceCategory: 'project',
              },
            ],
          },
        ],
      }),
    )

    expect(planChatQuestionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        question: '안녕 그건 왜 그렇게 했어?',
      }),
    )
    expect(analyzeQuestionMock).toHaveBeenCalledWith(
      '대표 프로젝트가 뭐야 lee-spec-kit 그건 왜 그렇게 했어',
      'ko',
    )
    expect(resolveChatRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        question: '대표 프로젝트가 뭐야 lee-spec-kit 그건 왜 그렇게 했어',
        questionAnalysis: expect.objectContaining({
          searchQueries: [
            expect.objectContaining({
              additionalKeywords: ['lee-spec-kit'],
              preferredSourceCategories: ['project'],
            }),
          ],
        }),
      }),
    )
    expect(answerBlogQuestionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        question: '대표 프로젝트가 뭐야 lee-spec-kit 그건 왜 그렇게 했어',
      }),
    )
  })

  it('명확화가 필요한 질문은 retrieval 대신 clarification 응답을 반환한다', async () => {
    planChatQuestionMock.mockResolvedValueOnce({
      ok: true,
      questionPlan: {
        ...DEFAULT_QUESTION_PLAN,
        standaloneQuestion: '이 사람 이름 뭐야',
        needsRetrieval: false,
        retrievalMode: 'none',
        needsClarification: true,
        clarificationQuestion: CLARIFICATION_RESPONSE.answer,
        reason: 'ambiguous person reference',
      },
    })
    shouldCacheBlogChatResponseMock.mockReturnValueOnce(false)

    const { POST } = await importRouteModule()
    const response = await POST(createChatRequest('이 사람 이름 뭐야?'))

    expect(await response.json()).toEqual(CLARIFICATION_RESPONSE)
    expect(analyzeQuestionMock).not.toHaveBeenCalled()
    expect(resolveChatRequestMock).not.toHaveBeenCalled()
    expect(answerBlogQuestionMock).not.toHaveBeenCalled()
    expect(releaseChatConcurrentRequestSlotMock).toHaveBeenCalledTimes(1)
  })

  it('planner 설정이 비어 있으면 missing_api_key refusal 응답을 반환한다', async () => {
    planChatQuestionMock.mockResolvedValueOnce({
      ok: false,
      refusalReason: 'missing_api_key',
    })
    shouldCacheBlogChatResponseMock.mockReturnValueOnce(false)

    const { POST } = await importRouteModule()
    const response = await POST(createChatRequest('React stack?'))

    expect(await response.json()).toEqual({
      answer: '',
      citations: [],
      grounded: false,
      refusalReason: 'missing_api_key',
    })
    expect(analyzeQuestionMock).not.toHaveBeenCalled()
    expect(resolveChatRequestMock).not.toHaveBeenCalled()
    expect(answerBlogQuestionMock).not.toHaveBeenCalled()
    expect(releaseChatConcurrentRequestSlotMock).toHaveBeenCalledTimes(1)
  })

  it('planner 호출이 실패하면 model_error refusal 응답을 반환한다', async () => {
    planChatQuestionMock.mockResolvedValueOnce({
      ok: false,
      refusalReason: 'model_error',
    })
    shouldCacheBlogChatResponseMock.mockReturnValueOnce(false)

    const { POST } = await importRouteModule()
    const response = await POST(createChatRequest('React stack?'))

    expect(await response.json()).toEqual({
      answer: '',
      citations: [],
      grounded: false,
      refusalReason: 'model_error',
    })
    expect(analyzeQuestionMock).not.toHaveBeenCalled()
    expect(resolveChatRequestMock).not.toHaveBeenCalled()
    expect(answerBlogQuestionMock).not.toHaveBeenCalled()
    expect(releaseChatConcurrentRequestSlotMock).toHaveBeenCalledTimes(1)
  })

  it('short-window rate limit에 걸리면 planner 이전에 rate_limited 응답을 반환한다', async () => {
    consumeChatRequestRateLimitMock.mockReturnValueOnce({
      allowed: false,
      currentCount: 5,
      resetAt: Date.now() + 60_000,
    })
    shouldCacheBlogChatResponseMock.mockReturnValueOnce(false)

    const { POST } = await importRouteModule()
    const response = await POST(
      createChatRequest('React stack?', undefined, {
        'x-forwarded-for': '203.0.113.10',
      }),
    )

    expect(resolveChatClientKeyMock).toHaveBeenCalledTimes(1)
    expect(await response.json()).toEqual(RATE_LIMITED_RESPONSE)
    expect(acquireChatConcurrentRequestSlotMock).not.toHaveBeenCalled()
    expect(planChatQuestionMock).not.toHaveBeenCalled()
    expect(releaseChatConcurrentRequestSlotMock).not.toHaveBeenCalled()
  })

  it('동시 요청 제한에 걸리면 planner 이전에 rate_limited 응답을 반환한다', async () => {
    acquireChatConcurrentRequestSlotMock.mockReturnValueOnce({
      allowed: false,
      currentCount: 1,
    })
    shouldCacheBlogChatResponseMock.mockReturnValueOnce(false)

    const { POST } = await importRouteModule()
    const response = await POST(createChatRequest('React stack?'))

    expect(await response.json()).toEqual(RATE_LIMITED_RESPONSE)
    expect(planChatQuestionMock).not.toHaveBeenCalled()
    expect(releaseChatConcurrentRequestSlotMock).not.toHaveBeenCalled()
  })

  it('grounded retrieval 질문은 lexical 검색 실패 후 Postgres RAG를 fallback으로 사용한다', async () => {
    resolveChatRequestMock.mockReturnValueOnce({
      normalizedQuestion: 'what is his name',
      questionType: 'general',
      shouldCallModel: false,
      matches: [],
      refusalReason: 'insufficient_search_match',
    })
    planChatQuestionMock.mockResolvedValueOnce({
      ok: true,
      questionPlan: {
        ...DEFAULT_QUESTION_PLAN,
        standaloneQuestion: 'what is his name',
        preferredSourceCategories: ['profile'],
        additionalKeywords: ['name', 'yoonsu lee'],
        reason: 'profile lookup',
      },
    })
    analyzeQuestionMock.mockReturnValueOnce({
      normalizedQuestion: 'what is his name',
      questionType: 'general',
      searchQueries: [
        {
          question: 'what is his name',
          intent: 'general',
          additionalKeywords: [],
          preferredSourceCategories: [],
        },
      ],
    })
    runChatRagWorkflowMock.mockResolvedValueOnce({
      grounded: true,
      matches: [
        {
          id: 'en/about/profile',
          locale: 'en',
          slug: 'about',
          title: 'Yoonsu Lee',
          url: '/en/about',
          excerpt: 'Yoonsu Lee is a frontend developer.',
          content: 'Yoonsu Lee is a frontend developer.',
          sectionTitle: null,
          tags: ['profile'],
          publishedAt: null,
          sourceCategory: 'profile' as const,
        },
      ],
    })

    const { POST } = await importRouteModule()
    const response = await POST(createChatRequest('what is his name'))

    expect(await response.json()).toEqual(
      expect.objectContaining(GROUNDED_RESPONSE),
    )
    expect(runChatRagWorkflowMock).toHaveBeenCalledWith({
      question: 'what is his name',
      locale: 'ko',
      currentPostSlug: undefined,
    })
    expect(answerBlogQuestionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        matches: [
          expect.objectContaining({
            slug: 'about',
          }),
        ],
      }),
    )
  })

  it('corpus synthesis 질문은 lexical과 Postgres RAG 후보를 함께 재정렬한다', async () => {
    planChatQuestionMock.mockResolvedValueOnce({
      ok: true,
      questionPlan: {
        ...DEFAULT_QUESTION_PLAN,
        standaloneQuestion: '이 블로그 전체를 보면 공통된 설계 철학이 뭐야',
        action: 'summarize',
        retrievalMode: 'corpus',
        preferredSourceCategories: ['blog'],
        additionalKeywords: ['구조', '재사용성'],
        reason: 'cross-document synthesis',
      },
    })
    analyzeQuestionMock.mockReturnValueOnce({
      normalizedQuestion: '이 블로그 전체를 보면 공통된 설계 철학이 뭐야',
      questionType: 'general',
      searchQueries: [
        {
          question: '이 블로그 전체를 보면 공통된 설계 철학이 뭐야',
          intent: 'general',
          additionalKeywords: [],
          preferredSourceCategories: [],
        },
      ],
    })
    resolveChatRequestMock.mockReturnValueOnce({
      normalizedQuestion: '이 블로그 전체를 보면 공통된 설계 철학이 뭐야',
      questionType: 'general',
      shouldCallModel: false,
      matches: [
        {
          id: 'ko/blog/lee-spec-kit',
          locale: 'ko',
          slug: 'lee-spec-kit',
          title: 'lee-spec-kit',
          url: '/ko/blog/lee-spec-kit',
          excerpt: '문서 구조와 하네스를 다룹니다.',
          content: '문서 구조와 하네스를 다룹니다.',
          sectionTitle: null,
          tags: ['blog'],
          sourceCategory: 'blog' as const,
        },
      ],
    })
    runChatRagWorkflowMock.mockResolvedValueOnce({
      grounded: true,
      matches: [
        {
          id: 'ko/project/lee-spec-kit',
          locale: 'ko',
          slug: 'lee-spec-kit',
          title: 'lee-spec-kit',
          url: '/ko/projects/lee-spec-kit',
          excerpt: '구조와 재사용성을 중시합니다.',
          content: '구조와 재사용성을 중시합니다.',
          sectionTitle: null,
          tags: ['project'],
          publishedAt: null,
          sourceCategory: 'project' as const,
        },
      ],
    })

    const { POST } = await importRouteModule()
    const response = await POST(
      createChatRequest('이 블로그 전체를 보면 공통된 설계 철학이 뭐야?'),
    )

    expect(await response.json()).toEqual(
      expect.objectContaining(GROUNDED_RESPONSE),
    )
    expect(runChatRagWorkflowMock).toHaveBeenCalledTimes(1)
    expect(answerBlogQuestionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        matches: expect.arrayContaining([
          expect.objectContaining({
            url: '/ko/blog/lee-spec-kit',
          }),
          expect.objectContaining({
            url: '/ko/projects/lee-spec-kit',
          }),
        ]),
      }),
    )
  })

  it('retrieval 후보가 많고 질문이 복합적이면 rerank를 적용한다', async () => {
    rerankChatEvidenceMock.mockResolvedValueOnce([
      {
        id: 'blog',
        locale: 'ko',
        slug: 'nivo-chart',
        title: 'nivo chart로 데이터 시각화하기',
        url: '/ko/blog/nivo-chart',
        excerpt: 'nivo',
        content: 'nivo',
        sectionTitle: null,
        tags: ['nivo'],
        sourceCategory: 'blog' as const,
      },
      {
        id: 'profile',
        locale: 'ko',
        slug: 'about',
        title: 'About Me',
        url: '/ko/about',
        excerpt: 'React와 TypeScript를 사용합니다.',
        content: 'React와 TypeScript를 사용합니다.',
        sectionTitle: null,
        tags: ['react', 'typescript'],
        sourceCategory: 'profile' as const,
      },
    ])
    resolveChatRequestMock.mockReturnValueOnce({
      normalizedQuestion: '기술 스택과 시각화 경험이 뭐야',
      questionType: 'general',
      shouldCallModel: true,
      matches: [
        {
          id: 'profile',
          locale: 'ko',
          slug: 'about',
          title: 'About Me',
          url: '/ko/about',
          excerpt: 'React와 TypeScript를 사용합니다.',
          content: 'React와 TypeScript를 사용합니다.',
          sectionTitle: null,
          tags: ['react', 'typescript'],
          sourceCategory: 'profile' as const,
        },
        {
          id: 'blog',
          locale: 'ko',
          slug: 'nivo-chart',
          title: 'nivo chart로 데이터 시각화하기',
          url: '/ko/blog/nivo-chart',
          excerpt: 'nivo',
          content: 'nivo',
          sectionTitle: null,
          tags: ['nivo'],
          sourceCategory: 'blog' as const,
        },
      ],
    })
    planChatQuestionMock.mockResolvedValueOnce({
      ok: true,
      questionPlan: {
        ...DEFAULT_QUESTION_PLAN,
        standaloneQuestion: '기술 스택과 시각화 경험이 뭐야',
        reason: 'compound retrieval',
      },
    })

    const { POST } = await importRouteModule()
    await POST(createChatRequest('기술 스택과 시각화 경험이 뭐야?'))

    expect(rerankChatEvidenceMock).toHaveBeenCalledTimes(1)
    expect(answerBlogQuestionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        matches: expect.arrayContaining([
          expect.objectContaining({ url: '/ko/blog/nivo-chart' }),
        ]),
      }),
    )
  })

  it('grounded 응답은 observability 로그와 semantic cache 저장을 수행한다', async () => {
    const { POST } = await importRouteModule()
    await POST(createChatRequest('React stack?'))

    expect(storeSemanticCachedBlogChatResponseMock).toHaveBeenCalledTimes(1)
    expect(recordChatObservabilityEventMock).toHaveBeenCalledTimes(1)
  })

  it('standard retrieval 질문은 현재 글 페이지에서도 semantic current post boost를 전달하지 않는다', async () => {
    planChatQuestionMock.mockResolvedValueOnce({
      ok: true,
      questionPlan: {
        ...DEFAULT_QUESTION_PLAN,
        standaloneQuestion: '이 사람 이름 뭐야',
        reason: 'ambiguous retrieval from planner',
      },
    })
    analyzeQuestionMock.mockReturnValueOnce({
      normalizedQuestion: '이 사람 이름 뭐야',
      questionType: 'general',
      searchQueries: [
        {
          question: '이 사람 이름 뭐야',
          intent: 'general',
          additionalKeywords: [],
          preferredSourceCategories: [],
        },
      ],
    })
    resolveChatRequestMock.mockReturnValueOnce({
      normalizedQuestion: '이 사람 이름 뭐야',
      questionType: 'general',
      shouldCallModel: false,
      matches: [],
      refusalReason: 'insufficient_search_match',
    })

    const { POST } = await importRouteModule()

    await POST(
      createChatRequest('이 사람 이름 뭐야?', {
        currentPostSlug: 'why-i-built-lee-spec-kit',
      }),
    )

    expect(runChatRagWorkflowMock).toHaveBeenCalledWith({
      question: '이 사람 이름 뭐야',
      locale: 'ko',
      currentPostSlug: undefined,
    })
    expect(releaseChatConcurrentRequestSlotMock).toHaveBeenCalledTimes(1)
  })
})
