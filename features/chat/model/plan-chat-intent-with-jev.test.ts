import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  JevChatRoute,
  JevChatRouteDecision,
} from '@/features/chat/api/evaluate-chat-intent-with-jev'
import { EMPTY_CHAT_CONVERSATION_STATE } from '@/features/chat/model/chat-conversation-state'
import {
  buildJevChatQueryPlan,
  planChatIntentWithJev,
} from '@/features/chat/model/plan-chat-intent-with-jev'

const { evaluateChatIntentWithJevMock } = vi.hoisted(() => ({
  evaluateChatIntentWithJevMock: vi.fn(),
}))

vi.mock('@/features/chat/api/evaluate-chat-intent-with-jev', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/chat/api/evaluate-chat-intent-with-jev')
  >('@/features/chat/api/evaluate-chat-intent-with-jev')

  return {
    ...actual,
    evaluateChatIntentWithJev: evaluateChatIntentWithJevMock,
    isJevChatIntentEvaluationConfigured: () => true,
  }
})

const HIGH_CONFIDENCE = 0.95
const LOW_CONFIDENCE = 0.49

function buildDecision(
  route: JevChatRoute,
  confidence = HIGH_CONFIDENCE,
): JevChatRouteDecision {
  return { route, confidence }
}

describe('buildJevChatQueryPlan', () => {
  beforeEach(() => {
    evaluateChatIntentWithJevMock.mockReset()
  })

  it.each([
    ['social_reply', 'social_reply'],
    ['identity', 'identity'],
    ['owner_identity', 'owner_identity'],
    ['public_contact', 'contact'],
    ['private_contact', 'private_contact'],
  ] as const)(
    '%s route를 준비된 direct operation %s로 변환한다',
    (route, operation) => {
      const queryPlan = buildJevChatQueryPlan({
        question: '질문',
        decision: buildDecision(route),
      })

      expect(queryPlan).toMatchObject({
        operation,
        targetSelection: { kind: 'none' },
        reason: `Jev selected the ${route} route.`,
      })
    },
  )

  it('공개 연락처만 contact_methods 필드를 요청한다', () => {
    const publicContactPlan = buildJevChatQueryPlan({
      question: 'GitHub 알려줘',
      decision: buildDecision('public_contact'),
    })
    const privateContactPlan = buildJevChatQueryPlan({
      question: '전화번호 알려줘',
      decision: buildDecision('private_contact'),
    })

    expect(publicContactPlan?.requestedFields).toEqual(['contact_methods'])
    expect(privateContactPlan?.requestedFields).toEqual([])
  })

  it('LLM planner route는 기존 planner로 넘긴다', () => {
    expect(
      buildJevChatQueryPlan({
        question: '최근 직장이 어디야?',
        decision: buildDecision('llm_planner'),
      }),
    ).toBeNull()
  })

  it('confidence가 기준보다 낮으면 기존 planner로 넘긴다', () => {
    expect(
      buildJevChatQueryPlan({
        question: '너 누구야?',
        decision: buildDecision('identity', LOW_CONFIDENCE),
      }),
    ).toBeNull()
  })

  it('후속 대화도 생략하지 않고 축약 문맥과 함께 Jev에 전달한다', async () => {
    evaluateChatIntentWithJevMock.mockResolvedValueOnce(
      buildDecision('llm_planner'),
    )
    const conversationHistory = [
      {
        question: 'Leemage를 설명해줘',
        answer: 'Leemage 프로젝트 설명입니다.',
        citations: [
          {
            title: 'Leemage',
            url: '/ko/projects/leemage',
            sectionTitle: null,
            sourceCategory: 'project' as const,
          },
        ],
      },
    ]

    const result = await planChatIntentWithJev({
      question: '왜 그렇게 만들었어?',
      locale: 'ko',
      conversationState: EMPTY_CHAT_CONVERSATION_STATE,
      conversationHistory,
    })

    expect(result).toBeNull()
    expect(evaluateChatIntentWithJevMock).toHaveBeenCalledWith(
      expect.objectContaining({
        question: '왜 그렇게 만들었어?',
        conversationContext: expect.objectContaining({
          latestConversationQuestion: 'Leemage를 설명해줘',
          recentConversationTurns: conversationHistory,
        }),
      }),
    )
  })
})
