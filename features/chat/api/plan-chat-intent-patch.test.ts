import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type ChatConversationState,
  EMPTY_CHAT_CONVERSATION_STATE,
} from '@/features/chat/model/chat-conversation-state'

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
  greetingAnswer: '안녕하세요.',
  identityAnswer: '저는 블로그 챗봇입니다.',
  aliases: [],
  content: '이윤수의 블로그 챗봇입니다.',
}

const LATEST_POST_PATCH = {
  standaloneQuestion: '블로그의 최신 글은 언제 게시되었나요?',
  targetUpdate: { kind: 'clear' },
  operation: 'answer',
  temporalConstraint: { order: 'latest' },
  requestedFields: ['title', 'published_at'],
  evidenceScope: 'corpus',
  requiredConcepts: [],
  optionalConcepts: [],
  missingSlots: [],
  clarificationQuestion: null,
  confidence: 'high',
  reason: 'The user asks for the latest post publication date.',
} as const

function buildOwnerState(): ChatConversationState {
  return {
    ...EMPTY_CHAT_CONVERSATION_STATE,
    resolvedTarget: {
      kind: 'profile',
      sourceCategory: 'profile',
      slug: 'about',
      title: '이윤수',
    },
    activeOperation: 'answer',
    requestedFields: ['content'],
    requiredConcepts: ['Vercel'],
    evidenceScope: 'entity',
    lastResolvedQuestion: '이윤수가 Vercel을 사용했나요?',
  }
}

describe('planChatIntentPatch', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.OPENAI_API_KEY = 'test-key'
  })

  afterEach(() => {
    delete process.env.OPENAI_API_KEY
  })

  it('최신 글 질문의 시간 조건과 요청 필드를 보존한다', async () => {
    generateTextMock.mockResolvedValueOnce({ output: LATEST_POST_PATCH })
    const { planChatIntentPatch } = await import('./plan-chat-intent-patch')

    const result = await planChatIntentPatch({
      question: '마지막 글 언제야?',
      locale: 'ko',
      conversationState: EMPTY_CHAT_CONVERSATION_STATE,
      assistantProfile: CHAT_ASSISTANT_PROFILE,
    })

    expect(result).toEqual({
      ok: true,
      intentPatch: LATEST_POST_PATCH,
    })
  })

  it('확정된 작성자 상태를 prompt에 전달하고 target preserve patch를 받는다', async () => {
    generateTextMock.mockResolvedValueOnce({
      output: {
        ...LATEST_POST_PATCH,
        standaloneQuestion: '이윤수가 Vercel을 사용했나요?',
        targetUpdate: { kind: 'preserve' },
        temporalConstraint: { order: 'none' },
        requestedFields: ['content'],
        evidenceScope: 'entity',
        requiredConcepts: ['Vercel'],
        reason: 'The resolved owner target should be preserved.',
      },
    })
    const conversationState = buildOwnerState()
    const { planChatIntentPatch } = await import('./plan-chat-intent-patch')

    const result = await planChatIntentPatch({
      question: '이 사람 Vercel 써봤어?',
      locale: 'ko',
      conversationState,
      assistantProfile: CHAT_ASSISTANT_PROFILE,
    })

    expect(result).toMatchObject({
      ok: true,
      intentPatch: {
        targetUpdate: { kind: 'preserve' },
        requiredConcepts: ['Vercel'],
      },
    })
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining(JSON.stringify(conversationState)),
      }),
    )
  })

  it('명확화 답변에서 작성자 대상으로 교체하는 patch를 반환한다', async () => {
    generateTextMock.mockResolvedValueOnce({
      output: {
        ...LATEST_POST_PATCH,
        standaloneQuestion: '블로그 주인은 이윤수입니다.',
        targetUpdate: {
          kind: 'replace',
          target: {
            kind: 'profile',
            sourceCategory: 'profile',
            slug: 'about',
            title: '이윤수',
          },
        },
        temporalConstraint: { order: 'none' },
        requestedFields: ['content'],
        evidenceScope: 'entity',
        reason: 'The user supplied the missing owner target.',
      },
    })
    const { planChatIntentPatch } = await import('./plan-chat-intent-patch')

    const result = await planChatIntentPatch({
      question: '블로그 주인',
      locale: 'ko',
      conversationState: EMPTY_CHAT_CONVERSATION_STATE,
      assistantProfile: CHAT_ASSISTANT_PROFILE,
    })

    expect(result).toMatchObject({
      ok: true,
      intentPatch: {
        targetUpdate: {
          kind: 'replace',
          target: { title: '이윤수' },
        },
      },
    })
  })

  it('첫 planner 호출이 실패하면 한 번 재시도한다', async () => {
    generateTextMock
      .mockRejectedValueOnce(new Error('temporary timeout'))
      .mockResolvedValueOnce({ output: LATEST_POST_PATCH })
    const { planChatIntentPatch } = await import('./plan-chat-intent-patch')

    const result = await planChatIntentPatch({
      question: '마지막 글 언제야?',
      locale: 'ko',
      conversationState: EMPTY_CHAT_CONVERSATION_STATE,
      assistantProfile: CHAT_ASSISTANT_PROFILE,
    })

    expect(result.ok).toBe(true)
    expect(generateTextMock).toHaveBeenCalledTimes(2)
  })

  it('두 번 모두 실패하면 planner_unavailable 사유를 반환한다', async () => {
    generateTextMock.mockRejectedValue(new Error('timeout'))
    const { planChatIntentPatch } = await import('./plan-chat-intent-patch')

    const result = await planChatIntentPatch({
      question: '마지막 글 언제야?',
      locale: 'ko',
      conversationState: EMPTY_CHAT_CONVERSATION_STATE,
      assistantProfile: CHAT_ASSISTANT_PROFILE,
    })

    expect(result).toEqual({
      ok: false,
      refusalReason: 'model_error',
      failureKind: 'planner_unavailable',
    })
    expect(generateTextMock).toHaveBeenCalledTimes(2)
  })
})
