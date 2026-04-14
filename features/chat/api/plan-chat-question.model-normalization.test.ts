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

describe('planChatQuestion failure handling', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    delete process.env.OPENAI_API_KEY
  })

  it('OPENAI_API_KEY가 없으면 missing_api_key 실패를 반환한다', async () => {
    delete process.env.OPENAI_API_KEY

    const { planChatQuestion } = await import('./plan-chat-question')
    const result = await planChatQuestion({
      question: '안녕?',
      locale: 'ko',
      assistantProfile: CHAT_ASSISTANT_PROFILE,
    })

    expect(result).toEqual({
      ok: false,
      refusalReason: 'missing_api_key',
    })
    expect(generateTextMock).not.toHaveBeenCalled()
  })

  it('planner API 호출이 실패하면 model_error를 반환한다', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    generateTextMock.mockRejectedValueOnce(new Error('timeout'))

    const { planChatQuestion } = await import('./plan-chat-question')
    const result = await planChatQuestion({
      question: '안녕?',
      locale: 'ko',
      assistantProfile: CHAT_ASSISTANT_PROFILE,
    })

    expect(result).toEqual({
      ok: false,
      refusalReason: 'model_error',
    })
  })

  it('planner가 잘못된 구조화 응답을 주면 model_error를 반환한다', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    generateTextMock.mockResolvedValueOnce({
      output: {
        standaloneQuestion: '',
        socialPreamble: false,
      },
    })

    const { planChatQuestion } = await import('./plan-chat-question')
    const result = await planChatQuestion({
      question: '안녕?',
      locale: 'ko',
      assistantProfile: CHAT_ASSISTANT_PROFILE,
    })

    expect(result).toEqual({
      ok: false,
      refusalReason: 'model_error',
    })
  })
})
