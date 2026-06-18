import { describe, expect, it, vi } from 'vitest'
import {
  type ChatConversationState,
  EMPTY_CHAT_CONVERSATION_STATE,
} from '@/features/chat/model/chat-conversation-state'
import type { ChatIntentPlan } from '@/features/chat/model/chat-intent'
import type { BlogChatRequest } from '@/features/chat/model/chat-schema'
import { runStatefulBlogChatPipeline } from '@/features/chat/model/run-stateful-blog-chat-pipeline'

const OWNER_CANDIDATE = {
  entityId: 'profile/about',
  kind: 'profile' as const,
  slug: 'about',
  title: '이윤수',
  aliases: ['이윤수', '블로그 주인'],
  searchTerms: ['작성자'],
  sourceCategory: 'profile' as const,
}

const OWNER_PLAN: ChatIntentPlan = {
  standaloneQuestion: '이윤수가 Vercel을 사용했나요?',
  contextAction: 'reset',
  targetSelection: { kind: 'candidate', entityId: 'profile/about' },
  operation: 'answer',
  temporalConstraint: { order: 'none' },
  requestedFields: ['content'],
  evidenceScope: 'entity',
  requiredConcepts: ['Vercel'],
  optionalConcepts: [],
  missingSlots: [],
  clarificationQuestion: null,
  confidence: 'high',
  reason: 'Complete owner question.',
}

function buildRequest(
  conversationState: ChatConversationState = EMPTY_CHAT_CONVERSATION_STATE,
): BlogChatRequest {
  return {
    question: '블로그 주인',
    locale: 'ko',
    conversationHistory: [],
    conversationState,
  }
}

function buildDependencies() {
  return {
    getEntityCandidates: vi.fn().mockResolvedValue([OWNER_CANDIDATE]),
    planIntent: vi.fn().mockResolvedValue({
      ok: true as const,
      intentPlan: OWNER_PLAN,
    }),
    executeIntent: vi.fn().mockImplementation(({ intent }) => {
      return Promise.resolve(
        intent.missingSlots.length > 0
          ? {
              kind: 'direct' as const,
              response: {
                answer: intent.clarificationQuestion,
                grounded: false,
                citations: [],
              },
              matches: [],
            }
          : {
              kind: 'direct' as const,
              response: {
                answer: '근거가 있는 답변',
                grounded: true,
                citations: [],
              },
              matches: [],
            },
      )
    }),
    answerQuestion: vi.fn(),
    getCachedResponse: vi.fn().mockReturnValue(null),
    setCachedResponse: vi.fn(),
    findSemanticResponse: vi.fn().mockResolvedValue(undefined),
    storeSemanticResponse: vi.fn().mockResolvedValue(undefined),
  }
}

describe('runStatefulBlogChatPipeline', () => {
  it('catalog에서 질문 후보를 찾고 planner에 전달한다', async () => {
    const dependencies = buildDependencies()

    await runStatefulBlogChatPipeline({
      request: buildRequest(),
      dependencies,
    })

    expect(dependencies.getEntityCandidates).toHaveBeenCalledWith('ko')
    expect(dependencies.planIntent).toHaveBeenCalledWith(
      expect.objectContaining({ entityCandidates: [OWNER_CANDIDATE] }),
    )
  })

  it('planner 실패 시 이전 상태를 유지하고 실행하지 않는다', async () => {
    const dependencies = buildDependencies()
    const previousState = {
      ...EMPTY_CHAT_CONVERSATION_STATE,
      focusedTarget: {
        kind: 'profile' as const,
        sourceCategory: 'profile' as const,
        slug: 'about',
        title: '이윤수',
      },
    }
    dependencies.planIntent.mockResolvedValueOnce({
      ok: false,
      refusalReason: 'model_error',
      failureKind: 'planner_unavailable',
    })

    const result = await runStatefulBlogChatPipeline({
      request: buildRequest(previousState),
      dependencies,
    })

    expect(result.applicationResponse.conversationState).toEqual(previousState)
    expect(dependencies.executeIntent).not.toHaveBeenCalled()
  })

  it('명확화 답변은 pending intent를 명시적으로 재개한다', async () => {
    const dependencies = buildDependencies()
    const suspendedIntent = {
      standaloneQuestion: '블로그 주인이 Vercel을 사용했나요?',
      operation: 'answer' as const,
      target: {
        kind: 'none' as const,
        sourceCategory: null,
        slug: null,
        title: null,
      },
      temporalConstraint: { order: 'none' as const },
      requestedFields: ['content' as const],
      evidenceScope: 'none' as const,
      requiredConcepts: ['Vercel'],
      optionalConcepts: [],
      missingSlots: ['target' as const],
      clarificationQuestion: '누구를 가리키는지 알려주세요.',
      confidence: 'low' as const,
      reason: 'Missing target.',
    }
    const pendingState: ChatConversationState = {
      ...EMPTY_CHAT_CONVERSATION_STATE,
      pendingClarification: {
        missingSlots: ['target'],
        clarificationQuestion: '누구를 가리키는지 알려주세요.',
        suspendedIntent,
      },
    }
    dependencies.planIntent.mockResolvedValueOnce({
      ok: true,
      intentPlan: {
        ...OWNER_PLAN,
        contextAction: 'resolve_clarification',
      },
    })

    await runStatefulBlogChatPipeline({
      request: buildRequest(pendingState),
      dependencies,
    })

    expect(dependencies.executeIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: expect.objectContaining({
          standaloneQuestion: suspendedIntent.standaloneQuestion,
          requiredConcepts: ['Vercel'],
          missingSlots: [],
        }),
      }),
    )
  })
})
