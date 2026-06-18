import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EMPTY_CHAT_CONVERSATION_STATE } from '@/features/chat/model/chat-conversation-state'

const generateTextMock = vi.fn()

vi.mock('ai', () => ({
  generateText: generateTextMock,
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
  temporalConstraint: { order: 'none' },
  requestedFields: ['content'],
  evidenceScope: 'entity',
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
    process.env.OPENAI_API_KEY = 'test-key'
  })

  afterEach(() => {
    delete process.env.OPENAI_API_KEY
  })

  it('candidate 목록을 prompt에 전달하고 plan을 반환한다', async () => {
    generateTextMock.mockResolvedValueOnce({ output: LEEMAGE_PLAN })
    const { planChatIntent } = await import('./plan-chat-intent-patch')

    const result = await planChatIntent({
      question: LEEMAGE_PLAN.standaloneQuestion,
      locale: 'ko',
      conversationState: EMPTY_CHAT_CONVERSATION_STATE,
      entityCandidates: [LEEMAGE_CANDIDATE],
    })

    expect(result).toEqual({ ok: true, intentPlan: LEEMAGE_PLAN })
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
})
