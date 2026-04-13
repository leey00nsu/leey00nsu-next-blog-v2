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

describe('planChatQuestion model normalization', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.OPENAI_API_KEY = 'test-key'
  })

  afterEach(() => {
    delete process.env.OPENAI_API_KEY
  })

  it('모델이 current_post로 잘못 계획해도 모호한 사람 지시어는 clarification으로 정규화한다', async () => {
    generateTextMock.mockResolvedValueOnce({
      output: {
        standaloneQuestion: '이 사람 이름 뭐야',
        socialPreamble: false,
        action: 'answer',
        scope: 'current_page',
        deterministicAction: 'none',
        needsRetrieval: true,
        retrievalMode: 'current_post',
        preferredSourceCategories: ['blog'],
        additionalKeywords: [],
        needsClarification: false,
        clarificationQuestion: null,
        reason: 'model planned current page lookup',
      },
    })

    const { planChatQuestion } = await import('./plan-chat-question')
    const result = await planChatQuestion({
      question: '이 사람 이름 뭐야?',
      locale: 'ko',
      currentPostSlug: 'why-i-built-lee-spec-kit',
      assistantProfile: CHAT_ASSISTANT_PROFILE,
    })

    expect(result.needsClarification).toBe(true)
    expect(result.needsRetrieval).toBe(false)
    expect(result.retrievalMode).toBe('none')
    expect(result.clarificationQuestion).toContain('구체적으로')
  })
})
