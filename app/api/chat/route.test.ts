import type { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const analyzeQuestionMock = vi.fn()
const answerBlogQuestionMock = vi.fn()
const shouldCacheBlogChatResponseMock = vi.fn()
const finalizeBlogChatResponseMock = vi.fn()
const resolveChatRequestMock = vi.fn()
const getCuratedChatSourcesMock = vi.fn()
const classifyChatQuestionMock = vi.fn()
const runChatRagWorkflowMock = vi.fn()

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

vi.mock('@/features/chat/api/classify-chat-question', () => {
  return {
    classifyChatQuestion: classifyChatQuestionMock,
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

function createChatRequest(question: string): NextRequest {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question,
      locale: 'ko',
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
    shouldCacheBlogChatResponseMock.mockReturnValue(true)
    finalizeBlogChatResponseMock.mockReturnValue(GROUNDED_RESPONSE)
    classifyChatQuestionMock.mockResolvedValue({
      selector: 'retrieval',
      action: 'answer',
      scope: 'global',
      reason: 'default',
    })
    runChatRagWorkflowMock.mockResolvedValue({
      grounded: false,
      matches: [],
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

  it('고정 응답은 일일 quota를 소모하지 않는다', async () => {
    analyzeQuestionMock
      .mockReturnValueOnce({
        normalizedQuestion: '안녕',
        questionType: 'general',
        searchQueries: [],
      })
      .mockReturnValueOnce({
        normalizedQuestion: 'react stack',
        questionType: 'general',
        searchQueries: [],
      })
    classifyChatQuestionMock
      .mockResolvedValueOnce({
        selector: 'greeting',
        action: 'answer',
        scope: 'global',
        reason: 'smalltalk',
      })
      .mockResolvedValueOnce({
        selector: 'retrieval',
        action: 'answer',
        scope: 'global',
        reason: 'fact',
      })

    resolveChatRequestMock
      .mockReturnValueOnce({
        normalizedQuestion: '안녕',
        questionType: 'greeting',
        shouldCallModel: false,
        matches: [],
        directResponse: {
          answer: '안녕하세요.',
          citations: [],
          grounded: false,
        },
      })
      .mockReturnValueOnce({
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

    const { POST } = await importRouteModule()

    const greetingResponse = await POST(createChatRequest('안녕'))
    const groundedResponse = await POST(createChatRequest('React stack?'))

    expect(await greetingResponse.json()).toEqual({
      answer: '안녕하세요.',
      citations: [],
      grounded: false,
    })
    expect(await groundedResponse.json()).toEqual(GROUNDED_RESPONSE)
    expect(answerBlogQuestionMock).toHaveBeenCalledTimes(1)
  })

  it('캐시 응답은 quota 검사 전에 반환한다', async () => {
    analyzeQuestionMock.mockReturnValue({
      normalizedQuestion: 'react stack',
      questionType: 'general',
      searchQueries: [],
    })

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

    const { POST } = await importRouteModule()

    const firstResponse = await POST(createChatRequest('React stack?'))
    const secondResponse = await POST(createChatRequest('React stack?'))

    expect(await firstResponse.json()).toEqual(GROUNDED_RESPONSE)
    expect(await secondResponse.json()).toEqual(GROUNDED_RESPONSE)
    expect(answerBlogQuestionMock).toHaveBeenCalledTimes(1)
  })

  it('후속 질문이면 대화 기록을 붙여 분석한다', async () => {
    analyzeQuestionMock.mockReturnValue({
      normalizedQuestion:
        '대표 프로젝트가 뭐야 lee-spec-kit 그건 왜 그렇게 했어',
      questionType: 'general',
      searchQueries: [],
    })
    classifyChatQuestionMock.mockResolvedValue({
      selector: 'retrieval',
      action: 'answer',
      scope: 'global',
      reason: 'fact',
    })

    resolveChatRequestMock.mockReturnValue({
      normalizedQuestion:
        '대표 프로젝트가 뭐야 lee-spec-kit 그건 왜 그렇게 했어',
      questionType: 'general',
      shouldCallModel: true,
      matches: [
        {
          id: 'ko/project/lee-spec-kit',
          locale: 'ko',
          slug: 'lee-spec-kit',
          title: 'lee-spec-kit',
          url: '/ko/projects/lee-spec-kit',
          excerpt: '프로젝트 소개',
          content: '프로젝트 소개',
          sectionTitle: null,
          tags: ['project'],
          sourceCategory: 'project' as const,
        },
      ],
    })

    const { POST } = await importRouteModule()

    await POST(
      new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: '그건 왜 그렇게 했어?',
          locale: 'ko',
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
      }) as NextRequest,
    )

    expect(analyzeQuestionMock).toHaveBeenCalledWith('그건 왜 그렇게 했어?')
    expect(analyzeQuestionMock).toHaveBeenCalledWith(
      '대표 프로젝트가 뭐야? lee-spec-kit 그건 왜 그렇게 했어?',
    )
    expect(answerBlogQuestionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        question: '대표 프로젝트가 뭐야? lee-spec-kit 그건 왜 그렇게 했어?',
      }),
    )
  })

  it('연락 질문 분류는 후속 질문 재작성 전에 원문 기준으로 수행한다', async () => {
    analyzeQuestionMock
      .mockReturnValueOnce({
        normalizedQuestion: '어떻게 연락해',
        questionType: 'general',
        searchQueries: [],
      })
      .mockReturnValueOnce({
        normalizedQuestion:
          '이 사람이 원하는 개발자는 어떤 개발자야 About Me 어떻게 연락해',
        questionType: 'general',
        searchQueries: [],
      })
    classifyChatQuestionMock.mockResolvedValue({
      selector: 'contact',
      action: 'answer',
      scope: 'global',
      reason: 'contact request',
    })
    resolveChatRequestMock.mockReturnValue({
      normalizedQuestion: '어떻게 연락해',
      questionType: 'general',
      shouldCallModel: false,
      matches: [],
      directResponse: {
        answer: '공개된 연락 채널은 GitHub와 LinkedIn입니다.',
        citations: [
          {
            title: 'About Me',
            url: '/ko/about',
            sectionTitle: null,
            sourceCategory: 'profile' as const,
          },
        ],
        grounded: true,
      },
    })

    const { POST } = await importRouteModule()

    await POST(
      new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: '어떻게 연락해?',
          locale: 'ko',
          conversationHistory: [
            {
              question: '이 사람이 원하는 개발자는 어떤 개발자야?',
              answer: '문제 해결 중심 개발자를 지향합니다.',
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
        }),
      }) as NextRequest,
    )

    expect(classifyChatQuestionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        question: '어떻게 연락해?',
      }),
    )
    expect(resolveChatRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        question: '어떻게 연락해?',
      }),
    )
  })

  it('grounded retrieval 질문은 lexical 검색 실패 후 Postgres RAG를 fallback으로 사용한다', async () => {
    analyzeQuestionMock.mockReturnValue({
      normalizedQuestion: 'what is his name',
      questionType: 'general',
      searchQueries: [],
    })
    classifyChatQuestionMock.mockResolvedValue({
      selector: 'retrieval',
      action: 'answer',
      scope: 'global',
      reason: 'fact',
    })
    resolveChatRequestMock.mockReturnValue({
      normalizedQuestion: 'what is his name',
      questionType: 'general',
      shouldCallModel: false,
      matches: [],
      refusalReason: 'insufficient_search_match',
    })
    runChatRagWorkflowMock.mockResolvedValue({
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

    expect(await response.json()).toEqual(GROUNDED_RESPONSE)
    expect(runChatRagWorkflowMock).toHaveBeenCalledWith({
      question: 'what is his name',
      locale: 'ko',
      currentPostSlug: undefined,
    })
    expect(resolveChatRequestMock).toHaveBeenCalled()
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

  it('ko 로케일에서도 영어 이름 질문은 retrieval 경로로 모델 호출을 진행한다', async () => {
    analyzeQuestionMock.mockReturnValue({
      normalizedQuestion: 'what is his name',
      questionType: 'general',
      searchQueries: [],
    })
    classifyChatQuestionMock.mockResolvedValue({
      selector: 'retrieval',
      action: 'answer',
      scope: 'global',
      reason: 'fact',
    })
    resolveChatRequestMock.mockReturnValue({
      normalizedQuestion: 'what is his name',
      questionType: 'general',
      shouldCallModel: true,
      matches: [
        {
          id: 'ko/about/profile',
          locale: 'ko',
          slug: 'about',
          title: 'About Me',
          url: '/ko/about',
          excerpt: '이윤수를 소개합니다.',
          content: '이윤수는 개발자입니다.',
          sectionTitle: null,
          tags: ['profile'],
          sourceCategory: 'profile' as const,
        },
      ],
    })

    const { POST } = await importRouteModule()
    const response = await POST(createChatRequest('what is his name'))

    expect(await response.json()).toEqual(GROUNDED_RESPONSE)
    expect(answerBlogQuestionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        matches: [
          expect.objectContaining({
            url: '/ko/about',
          }),
        ],
      }),
    )
  })

  it('corpus synthesis 질문은 lexical 검색 전에 Postgres RAG를 우선 사용한다', async () => {
    analyzeQuestionMock.mockReturnValue({
      normalizedQuestion: '이 블로그 전체를 보면 공통된 설계 철학이 뭐야',
      questionType: 'general',
      searchQueries: [],
    })
    classifyChatQuestionMock.mockResolvedValue({
      selector: 'corpus',
      action: 'summarize',
      scope: 'global',
      reason: 'cross-document synthesis',
    })
    runChatRagWorkflowMock.mockResolvedValue({
      grounded: true,
      matches: [
        {
          id: 'ko/about/profile',
          locale: 'ko',
          slug: 'about',
          title: 'About Me',
          url: '/ko/about',
          excerpt: '구조와 재사용성을 중시합니다.',
          content: '구조와 재사용성을 중시합니다.',
          sectionTitle: null,
          tags: ['profile'],
          publishedAt: null,
          sourceCategory: 'profile' as const,
        },
      ],
    })

    const { POST } = await importRouteModule()
    const response = await POST(
      createChatRequest('이 블로그 전체를 보면 공통된 설계 철학이 뭐야?'),
    )

    expect(await response.json()).toEqual(GROUNDED_RESPONSE)
    expect(runChatRagWorkflowMock).toHaveBeenCalledTimes(1)
    expect(resolveChatRequestMock).not.toHaveBeenCalled()
  })
})
