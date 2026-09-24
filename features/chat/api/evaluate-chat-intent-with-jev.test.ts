import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EMPTY_CHAT_CONVERSATION_STATE } from '@/features/chat/model/chat-conversation-state'

const evaluateMock = vi.fn()
const typeSafeClientMock = vi.fn()

vi.mock('@typesafe-ai/sdk', () => ({
  TypeSafeClient: typeSafeClientMock,
}))

const ROUTE_CONFIDENCE = 0.91

describe('evaluateChatIntentWithJev', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    evaluateMock.mockResolvedValue({
      answers: {
        route: {
          choice: 'identity',
          confidence: ROUTE_CONFIDENCE,
          probabilities: { identity: 0.95 },
        },
      },
    })
    typeSafeClientMock.mockImplementation(function TypeSafeClientMock() {
      return { systemOne: evaluateMock }
    })
    process.env.TYPESAFE_API_KEY = 'test-typesafe-key'
  })

  afterEach(() => {
    delete process.env.TYPESAFE_API_KEY
  })

  it('대화 상태를 포함해 route Choice 하나만 평가한다', async () => {
    const { evaluateChatIntentWithJev } = await import(
      '@/features/chat/api/evaluate-chat-intent-with-jev'
    )
    const conversationContext = {
      latestConversationQuestion: 'Leemage를 설명해줘',
      latestCitationTitles: ['Leemage'],
      latestCitationSourceCategories: ['project' as const],
      recentConversationTurns: [],
      hasCurrentPostContext: false,
    }
    const result = await evaluateChatIntentWithJev({
      question: '너 누구야?',
      locale: 'ko',
      conversationState: EMPTY_CHAT_CONVERSATION_STATE,
      conversationContext,
    })

    expect(typeSafeClientMock).toHaveBeenCalledWith(
      expect.objectContaining({ defaultModel: 'jev-latest' }),
    )
    expect(evaluateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'jev-latest',
        state: expect.objectContaining({
          question: '너 누구야?',
          conversationState: EMPTY_CHAT_CONVERSATION_STATE,
          conversationContext,
        }),
        questions: {
          route: expect.objectContaining({
            type: 'choice',
            criteria: expect.objectContaining({
              public_contact: expect.any(String),
              private_contact: expect.any(String),
              llm_planner: expect.any(String),
            }),
          }),
        },
      }),
      expect.objectContaining({ retry: { maxRetries: 0 } }),
    )
    expect(result).toEqual({
      route: 'identity',
      confidence: ROUTE_CONFIDENCE,
    })
  })
})
