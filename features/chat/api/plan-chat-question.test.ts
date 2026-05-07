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
})
