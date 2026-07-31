import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EMPTY_CHAT_CONVERSATION_STATE } from '@/features/chat/model/chat-conversation-state'

const generateTextMock = vi.fn()

vi.mock('ai', () => ({
  generateText: generateTextMock,
  NoObjectGeneratedError: {
    isInstance: vi.fn(() => false),
  },
  Output: { object: ({ schema }: { schema: unknown }) => ({ schema }) },
}))
vi.mock('@ai-sdk/openai', () => ({ openai: vi.fn(() => 'mock-model') }))

const LEEMAGE_CANDIDATE = {
  entityId: 'project/leemage',
  kind: 'project' as const,
  slug: 'leemage',
  title: 'Leemage',
  aliases: ['Leemage'],
  searchTerms: ['Presigned URL'],
  sourceCategory: 'project' as const,
}

const LEEMAGE_PLAN = {
  standaloneQuestion: 'Leemage에서 Presigned URL을 사용한 이유는?',
  contextAction: 'reset',
  targetSelection: { kind: 'candidate', entityId: 'project/leemage' },
  operation: 'explain',
  sourceSelection: { mode: 'only', categories: ['project'] },
  temporalSelection: { mode: 'none' },
  requestedFields: ['content'],
  requiredConcepts: ['Presigned URL'],
  optionalConcepts: [],
  missingSlots: [],
  clarificationQuestion: null,
  confidence: 'high',
  reason: 'Explicit project question.',
} as const

describe('planChatIntent', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    generateTextMock.mockReset()
    process.env.OPENAI_API_KEY = 'test-key'
    process.env.OPENAI_BLOG_CHAT_ROUTER_MODEL = 'test-router-model'
  })

  afterEach(() => {
    delete process.env.OPENAI_API_KEY
    delete process.env.OPENAI_BLOG_CHAT_ROUTER_MODEL
  })

  it.each(['넌 누구야?', '넌 누구지?'])(
    '챗봇 정체성 질문 "%s"을 모델 호출 없이 직접 계획한다',
    async (question) => {
      const { planChatIntent } = await import('./plan-chat-intent-patch')

      const result = await planChatIntent({
        question,
        locale: 'ko',
        conversationState: EMPTY_CHAT_CONVERSATION_STATE,
        entityCandidates: [],
      })

      expect(result).toMatchObject({
        ok: true,
        queryPlan: {
          operation: 'identity',
          requestedFields: [],
          missingSlots: [],
        },
      })
      expect(generateTextMock).not.toHaveBeenCalled()
    },
  )

  it('candidate 목록을 prompt에 전달하고 plan을 반환한다', async () => {
    generateTextMock.mockResolvedValueOnce({ output: LEEMAGE_PLAN })
    const { planChatIntent } = await import('./plan-chat-intent-patch')

    const result = await planChatIntent({
      question: LEEMAGE_PLAN.standaloneQuestion,
      locale: 'ko',
      conversationState: EMPTY_CHAT_CONVERSATION_STATE,
      entityCandidates: [LEEMAGE_CANDIDATE],
    })

    expect(result).toEqual({ ok: true, queryPlan: LEEMAGE_PLAN })
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining(JSON.stringify([LEEMAGE_CANDIDATE])),
      }),
    )
  })

  it('schema 오류를 전달해 한 번 재시도한다', async () => {
    generateTextMock
      .mockResolvedValueOnce({ output: { operation: 'answer' } })
      .mockResolvedValueOnce({ output: LEEMAGE_PLAN })
    const { planChatIntent } = await import('./plan-chat-intent-patch')

    const result = await planChatIntent({
      question: LEEMAGE_PLAN.standaloneQuestion,
      locale: 'ko',
      conversationState: EMPTY_CHAT_CONVERSATION_STATE,
      entityCandidates: [LEEMAGE_CANDIDATE],
    })

    expect(result.ok).toBe(true)
    expect(generateTextMock).toHaveBeenCalledTimes(2)
    expect(generateTextMock.mock.calls[1]?.[0].prompt).toContain(
      'previousValidationFailure=',
    )
  })

  it('두 번의 schema 오류를 invalid_intent_plan으로 반환한다', async () => {
    generateTextMock.mockResolvedValue({ output: { operation: 'answer' } })
    const { planChatIntent } = await import('./plan-chat-intent-patch')

    const result = await planChatIntent({
      question: '질문',
      locale: 'ko',
      conversationState: EMPTY_CHAT_CONVERSATION_STATE,
      entityCandidates: [],
    })

    expect(result).toEqual({
      ok: false,
      refusalReason: 'model_error',
      failureKind: 'invalid_intent_plan',
    })
  })

  it('근거 조회 plan의 빈 requestedFields를 content로 복구한다', async () => {
    generateTextMock.mockResolvedValueOnce({
      output: {
        standaloneQuestion: '최근 어디에서 일했어?',
        contextAction: 'continue',
        targetSelection: { kind: 'none' },
        operation: 'lookup',
        sourceSelection: { mode: 'all' },
        temporalSelection: { mode: 'rank', order: 'latest' },
        requestedFields: [],
        requiredConcepts: [],
        optionalConcepts: ['career', 'workplace'],
        missingSlots: [],
        clarificationQuestion: null,
        confidence: 'medium',
        reason: 'Recent workplace lookup.',
      },
    })
    const { planChatIntent } = await import('./plan-chat-intent-patch')

    const result = await planChatIntent({
      question: '작성자의 경력 정보를 정리해줘',
      locale: 'ko',
      conversationState: EMPTY_CHAT_CONVERSATION_STATE,
      entityCandidates: [],
    })

    expect(result).toMatchObject({
      ok: true,
      queryPlan: {
        contextAction: 'reset',
        requestedFields: ['content'],
      },
    })
  })

  it('첫 schema 오류 뒤 일반 호출 오류가 발생해도 invalid 분류를 보존한다', async () => {
    generateTextMock
      .mockResolvedValueOnce({ output: { operation: 'answer' } })
      .mockRejectedValueOnce(new Error('Temporary API failure'))
    const { planChatIntent } = await import('./plan-chat-intent-patch')

    const result = await planChatIntent({
      question: '질문',
      locale: 'ko',
      conversationState: EMPTY_CHAT_CONVERSATION_STATE,
      entityCandidates: [],
    })

    expect(result).toEqual({
      ok: false,
      refusalReason: 'model_error',
      failureKind: 'invalid_intent_plan',
    })
  })
})
