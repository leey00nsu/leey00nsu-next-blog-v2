import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const generateTextMock = vi.fn()

vi.mock('ai', () => {
  return {
    generateText: generateTextMock,
    Output: {
      object: ({ schema }: { schema: unknown }) => ({ schema }),
    },
  }
})

vi.mock('@ai-sdk/openai', () => {
  return {
    openai: vi.fn(() => 'mock-openai-model'),
  }
})

const CHAT_ASSISTANT_PROFILE = {
  title: '블로그 챗봇 안내',
  description: '챗봇 내부 안내 문서',
  chatbotName: '블로그 챗봇',
  ownerName: '이윤수',
  greetingAnswer:
    '안녕하세요. 저는 이윤수 님의 블로그 챗봇으로, 블로그 글과 공개된 소개 페이지를 근거로 답변하고 있어요.',
  identityAnswer:
    '저는 이윤수 님의 챗봇으로, 블로그 글과 공개된 소개 페이지를 근거로 답변하고 있어요.',
  aliases: ['누구의 챗봇이야'],
  content:
    '저는 이윤수 님의 챗봇입니다. 블로그 글과 공개된 소개 페이지를 근거로 답변합니다.',
}

describe('planChatQuestion', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.OPENAI_API_KEY = 'test-key'
  })

  afterEach(() => {
    delete process.env.OPENAI_API_KEY
  })

  it('planner가 mixed-intent 질문 계획을 반환하면 그대로 사용한다', async () => {
    generateTextMock.mockResolvedValueOnce({
      output: {
        standaloneQuestion: 'leesfield 라는 프로젝트 알아?',
        action: 'answer',
        route: 'retrieve',
        directAction: 'none',
        retrievalScope: 'entity',
        referenceTarget: {
          kind: 'named_entity',
          sourceCategory: 'project',
          slug: null,
          title: 'Leesfield',
          confidence: 'high',
        },
        preferredSourceCategories: ['project'],
        additionalKeywords: ['leesfield'],
        clarificationQuestion: null,
        reason: 'project lookup after greeting',
      },
    })

    const { planChatQuestion } = await import('./plan-chat-question')
    const result = await planChatQuestion({
      question: '안녕 leesfield 라는 프로젝트 알아?',
      locale: 'ko',
      assistantProfile: CHAT_ASSISTANT_PROFILE,
    })

    expect(result).toEqual({
      ok: true,
      questionPlan: {
        standaloneQuestion: 'leesfield 라는 프로젝트 알아?',
        action: 'answer',
        route: 'retrieve',
        directAction: 'none',
        retrievalScope: 'entity',
        referenceTarget: {
          kind: 'named_entity',
          sourceCategory: 'project',
          slug: null,
          title: 'Leesfield',
          confidence: 'high',
        },
        preferredSourceCategories: ['project'],
        additionalKeywords: ['leesfield'],
        clarificationQuestion: null,
        reason: 'project lookup after greeting',
      },
    })
  })

  it('planner가 latest_post direct action을 반환하면 그대로 사용한다', async () => {
    generateTextMock.mockResolvedValueOnce({
      output: {
        standaloneQuestion: '최신 글 요약해줘',
        action: 'summarize',
        route: 'direct',
        directAction: 'latest_post',
        retrievalScope: 'none',
        referenceTarget: {
          kind: 'none',
          sourceCategory: null,
          slug: null,
          title: null,
          confidence: 'high',
        },
        preferredSourceCategories: [],
        additionalKeywords: [],
        clarificationQuestion: null,
        reason: 'latest post request',
      },
    })

    const { planChatQuestion } = await import('./plan-chat-question')
    const result = await planChatQuestion({
      question: '최신 글 요약해줘',
      locale: 'ko',
      assistantProfile: CHAT_ASSISTANT_PROFILE,
    })

    expect(result).toEqual({
      ok: true,
      questionPlan: expect.objectContaining({
        route: 'direct',
        directAction: 'latest_post',
        action: 'summarize',
      }),
    })
  })

  it('planner가 clarification 질문을 반환하면 그대로 사용한다', async () => {
    generateTextMock.mockResolvedValueOnce({
      output: {
        standaloneQuestion: '이 사람 이름 뭐야?',
        action: 'answer',
        route: 'clarify',
        directAction: 'none',
        retrievalScope: 'none',
        referenceTarget: {
          kind: 'none',
          sourceCategory: null,
          slug: null,
          title: null,
          confidence: 'low',
        },
        preferredSourceCategories: [],
        additionalKeywords: [],
        clarificationQuestion: '누구를 가리키는지 조금 더 구체적으로 적어주세요.',
        reason: 'ambiguous person reference',
      },
    })

    const { planChatQuestion } = await import('./plan-chat-question')
    const result = await planChatQuestion({
      question: '이 사람 이름 뭐야?',
      locale: 'ko',
      assistantProfile: CHAT_ASSISTANT_PROFILE,
    })

    expect(result).toEqual({
      ok: true,
      questionPlan: expect.objectContaining({
        route: 'clarify',
        clarificationQuestion: '누구를 가리키는지 조금 더 구체적으로 적어주세요.',
      }),
    })
  })

  it('최근 대화의 답변과 citation 정보를 planner prompt에 포함한다', async () => {
    generateTextMock.mockResolvedValueOnce({
      output: {
        standaloneQuestion: '이윤수는 Vercel을 사용해 본 경험이 있는가?',
        action: 'answer',
        route: 'retrieve',
        directAction: 'none',
        retrievalScope: 'entity',
        referenceTarget: {
          kind: 'profile',
          sourceCategory: 'profile',
          slug: 'about',
          title: null,
          confidence: 'high',
        },
        preferredSourceCategories: ['profile', 'blog'],
        additionalKeywords: ['이윤수', 'Vercel'],
        clarificationQuestion: null,
        reason: 'follow-up resolves author reference',
      },
    })

    const { planChatQuestion } = await import('./plan-chat-question')

    await planChatQuestion({
      question: '블로그 주인',
      locale: 'ko',
      assistantProfile: CHAT_ASSISTANT_PROFILE,
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
    })

    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining(
          'recentConversationTurns=<turn index="1">',
        ),
      }),
    )
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining(
          'assistantAnswer=누구를 가리키는지 알려주세요.',
        ),
      }),
    )
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining(
          'citationUrls=/ko/about',
        ),
      }),
    )
  })

  it('대화 맥락 기반 참조 해소 규칙을 planner system prompt에 포함한다', async () => {
    generateTextMock.mockResolvedValueOnce({
      output: {
        standaloneQuestion: '이윤수는 Vercel을 사용해 본 경험이 있는가?',
        action: 'answer',
        route: 'retrieve',
        directAction: 'none',
        retrievalScope: 'entity',
        referenceTarget: {
          kind: 'profile',
          sourceCategory: 'profile',
          slug: 'about',
          title: null,
          confidence: 'high',
        },
        preferredSourceCategories: ['profile', 'blog'],
        additionalKeywords: ['이윤수', 'Vercel'],
        clarificationQuestion: null,
        reason: 'follow-up resolves author reference',
      },
    })

    const { planChatQuestion } = await import('./plan-chat-question')

    await planChatQuestion({
      question: '블로그 주인',
      locale: 'ko',
      assistantProfile: CHAT_ASSISTANT_PROFILE,
      conversationHistory: [
        {
          question: '이 사람이 Vercel 써봤냐고',
          answer: '누구를 가리키는지 알려주세요.',
          citations: [],
        },
      ],
    })

    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining(
          'Resolve short follow-up answers and pronouns from recentConversationTurns before choosing clarify.',
        ),
      }),
    )
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining(
          'Use assistantOwnerName as an entity candidate when the user refers to the blog owner, author, or site owner.',
        ),
      }),
    )
  })

  it('짧은 긍정 답변은 직전 명확화 질문을 확정한 검색 질문으로 planner에 전달한다', async () => {
    generateTextMock.mockResolvedValueOnce({
      output: {
        standaloneQuestion: '이윤수가 Vercel을 써봤는지',
        action: 'answer',
        route: 'retrieve',
        directAction: 'none',
        retrievalScope: 'entity',
        referenceTarget: {
          kind: 'profile',
          sourceCategory: 'profile',
          slug: 'about',
          title: null,
          confidence: 'high',
        },
        preferredSourceCategories: ['profile', 'blog'],
        additionalKeywords: ['이윤수', 'Vercel'],
        clarificationQuestion: null,
        reason: 'confirmed clarification',
      },
    })

    const { planChatQuestion } = await import('./plan-chat-question')

    await planChatQuestion({
      question: '그래',
      locale: 'ko',
      assistantProfile: CHAT_ASSISTANT_PROFILE,
      conversationHistory: [
        {
          question: '이 사람 Vercel 써봤어?',
          answer: '‘이 사람’이 블로그 작성자 이윤수를 말하는 건가요?',
          citations: [],
        },
      ],
    })

    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('originalQuestion=그래'),
      }),
    )
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining(
          'question=이 사람 Vercel 써봤어? ‘이 사람’이 블로그 작성자 이윤수를 말하는 건가요? 사용자가 긍정했습니다.',
        ),
      }),
    )
  })

  it('짧은 긍정 답변에 planner가 clarification을 반복하면 retrieve 계획으로 보정한다', async () => {
    generateTextMock.mockResolvedValueOnce({
      output: {
        standaloneQuestion: '이윤수가 Vercel을 써봤는지 물으시는 건가요?',
        action: 'answer',
        route: 'clarify',
        directAction: 'none',
        retrievalScope: 'none',
        referenceTarget: {
          kind: 'none',
          sourceCategory: null,
          slug: null,
          title: null,
          confidence: 'low',
        },
        preferredSourceCategories: [],
        additionalKeywords: ['Vercel'],
        clarificationQuestion: '이윤수가 Vercel을 써봤는지 물으시는 건가요?',
        reason: 'repeated clarification',
      },
    })

    const { planChatQuestion } = await import('./plan-chat-question')
    const result = await planChatQuestion({
      question: '그래',
      locale: 'ko',
      assistantProfile: CHAT_ASSISTANT_PROFILE,
      conversationHistory: [
        {
          question: '이 사람 Vercel 써봤어?',
          answer: '‘이 사람’이 블로그 작성자 이윤수를 말하는 건가요?',
          citations: [],
        },
      ],
    })

    expect(result).toEqual({
      ok: true,
      questionPlan: expect.objectContaining({
        standaloneQuestion:
          '이윤수가 Vercel을 써봤는지 물으시는 건가요?',
        route: 'retrieve',
        retrievalScope: 'entity',
        preferredSourceCategories: expect.arrayContaining(['profile', 'blog']),
        additionalKeywords: expect.arrayContaining(['Vercel', '이윤수']),
        clarificationQuestion: null,
      }),
    })
  })

  it('짧은 긍정 답변에서 작성자를 assistant target으로 오인하면 profile target으로 보정한다', async () => {
    generateTextMock.mockResolvedValueOnce({
      output: {
        standaloneQuestion:
          '블로그 작성자 이윤수는 Vercel을 사용해본 적이 있는지 알고 싶다.',
        action: 'answer',
        route: 'retrieve',
        directAction: 'none',
        retrievalScope: 'entity',
        referenceTarget: {
          kind: 'assistant',
          sourceCategory: 'assistant',
          slug: null,
          title: '이윤수',
          confidence: 'high',
        },
        preferredSourceCategories: ['blog', 'profile', 'project'],
        additionalKeywords: ['Vercel', '이윤수'],
        clarificationQuestion: null,
        reason: 'confirmed author reference',
      },
    })

    const { planChatQuestion } = await import('./plan-chat-question')
    const result = await planChatQuestion({
      question: '그래',
      locale: 'ko',
      assistantProfile: CHAT_ASSISTANT_PROFILE,
      conversationHistory: [
        {
          question: '이 사람 Vercel 써봤어?',
          answer: '‘이 사람’이 블로그 작성자 이윤수를 말하는 건가요?',
          citations: [],
        },
      ],
    })

    expect(result).toEqual({
      ok: true,
      questionPlan: expect.objectContaining({
        route: 'retrieve',
        retrievalScope: 'entity',
        referenceTarget: {
          kind: 'profile',
          sourceCategory: 'profile',
          slug: 'about',
          title: null,
          confidence: 'high',
        },
      }),
    })
  })

  it('마지막 글 날짜 질문을 planner가 corpus retrieval로 분류해도 latest_post direct plan으로 보정한다', async () => {
    generateTextMock.mockResolvedValueOnce({
      output: {
        standaloneQuestion: '블로그의 마지막 글이 언제인지 알고 싶다.',
        action: 'answer',
        route: 'retrieve',
        directAction: 'none',
        retrievalScope: 'corpus',
        referenceTarget: {
          kind: 'none',
          sourceCategory: null,
          slug: null,
          title: null,
          confidence: 'medium',
        },
        preferredSourceCategories: ['blog'],
        additionalKeywords: ['마지막 글', '최신 글', 'publish date'],
        clarificationQuestion: null,
        reason: 'latest post date lookup',
      },
    })

    const { planChatQuestion } = await import('./plan-chat-question')
    const result = await planChatQuestion({
      question: '마지막 글 언제야?',
      locale: 'ko',
      assistantProfile: CHAT_ASSISTANT_PROFILE,
    })

    expect(result).toEqual({
      ok: true,
      questionPlan: expect.objectContaining({
        route: 'direct',
        directAction: 'latest_post',
        retrievalScope: 'none',
        preferredSourceCategories: ['blog'],
        clarificationQuestion: null,
      }),
    })
  })

  it('typed intent frame의 시간 조건과 요청 필드로 최신 글 계획을 만든다', async () => {
    generateTextMock.mockResolvedValueOnce({
      output: {
        standaloneQuestion: '가장 나중에 발행한 게시물의 발행일은 무엇인가요?',
        domain: 'blog',
        operation: 'answer',
        target: {
          kind: 'none',
          sourceCategory: null,
          slug: null,
          title: null,
          confidence: 'high',
        },
        temporalConstraint: {
          order: 'latest',
        },
        requestedFields: ['title', 'published_at'],
        evidenceScope: 'corpus',
        searchConcepts: {
          required: [],
          optional: [],
        },
        missingSlots: [],
        clarificationQuestion: null,
        confidence: 'high',
        reason: 'latest publication date lookup',
      },
    })

    const { planChatQuestion } = await import('./plan-chat-question')
    const result = await planChatQuestion({
      question: '가장 나중에 발행한 게시물은 며칠에 올라왔어?',
      locale: 'ko',
      assistantProfile: CHAT_ASSISTANT_PROFILE,
    })

    expect(result).toEqual({
      ok: true,
      questionPlan: expect.objectContaining({
        route: 'direct',
        directAction: 'latest_post',
        retrievalScope: 'none',
        preferredSourceCategories: ['blog'],
      }),
    })
  })
})
