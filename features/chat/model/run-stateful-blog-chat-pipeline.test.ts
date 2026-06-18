import { describe, expect, it, vi } from 'vitest'
import {
  type ChatConversationState,
  EMPTY_CHAT_CONVERSATION_STATE,
} from '@/features/chat/model/chat-conversation-state'
import type { ChatIntentPatch } from '@/features/chat/model/chat-intent'
import type {
  BlogChatRequest,
  BlogChatResponse,
} from '@/features/chat/model/chat-schema'
import { runStatefulBlogChatPipeline } from '@/features/chat/model/run-stateful-blog-chat-pipeline'

const OWNER_TARGET = {
  kind: 'profile',
  sourceCategory: 'profile',
  slug: 'about',
  title: '이윤수',
} as const

const BASE_PATCH: ChatIntentPatch = {
  standaloneQuestion: '이윤수가 Vercel을 사용했나요?',
  targetUpdate: { kind: 'replace', target: OWNER_TARGET },
  operation: 'answer',
  temporalConstraint: { order: 'none' },
  requestedFields: ['content'],
  evidenceScope: 'entity',
  requiredConcepts: ['Vercel'],
  optionalConcepts: [],
  missingSlots: [],
  clarificationQuestion: null,
  confidence: 'high',
  reason: 'Complete author question.',
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
  let semanticCachedResponse: BlogChatResponse | undefined

  return {
    planIntentPatch: vi.fn().mockResolvedValue({
      ok: true as const,
      intentPatch: BASE_PATCH,
    }),
    executeIntent: vi.fn().mockImplementation(({ intent }) => {
      if (intent.missingSlots.length > 0) {
        return Promise.resolve({
          kind: 'direct' as const,
          response: {
            answer: intent.clarificationQuestion,
            grounded: false,
            citations: [],
          },
          matches: [],
        })
      }

      return Promise.resolve({
        kind: 'direct' as const,
        response: {
          answer: '이윤수는 Vercel 사용 경험이 있습니다.',
          grounded: true,
          citations: [
            {
              title: 'Vercel 사용 경험',
              url: '/ko/blog/vercel',
              sectionTitle: null,
              sourceCategory: 'blog' as const,
            },
          ],
        },
        matches: [],
      })
    }),
    answerQuestion: vi.fn(),
    getCachedResponse: vi.fn().mockReturnValue(null),
    setCachedResponse: vi.fn(),
    findSemanticResponse: vi.fn(() => Promise.resolve(semanticCachedResponse)),
    storeSemanticResponse: vi.fn(() => Promise.resolve()),
  }
}

describe('runStatefulBlogChatPipeline', () => {
  it('필수 target이 없으면 pending clarification 상태를 반환한다', async () => {
    const dependencies = buildDependencies()
    dependencies.planIntentPatch.mockResolvedValueOnce({
      ok: true,
      intentPatch: {
        ...BASE_PATCH,
        targetUpdate: { kind: 'clear' },
        missingSlots: ['target'],
        clarificationQuestion: '누구를 가리키는지 알려주세요.',
        confidence: 'low',
        reason: 'The target is missing.',
      },
    })

    const result = await runStatefulBlogChatPipeline({
      request: buildRequest(),
      assistantProfile: null,
      contactProfile: null,
      dependencies,
    })

    expect(result.applicationResponse.response.answer).toBe(
      '누구를 가리키는지 알려주세요.',
    )
    expect(
      result.applicationResponse.conversationState.pendingClarification,
    ).toMatchObject({
      missingSlots: ['target'],
      suspendedIntent: { requiredConcepts: ['Vercel'] },
    })
    expect(dependencies.setCachedResponse).not.toHaveBeenCalled()
  })

  it('target 답변이 들어오면 중단된 Intent를 재개해 executor에 전달한다', async () => {
    const dependencies = buildDependencies()
    const clarificationState: ChatConversationState = {
      ...EMPTY_CHAT_CONVERSATION_STATE,
      pendingClarification: {
        missingSlots: ['target'],
        clarificationQuestion: '누구를 가리키는지 알려주세요.',
        suspendedIntent: {
          standaloneQuestion: '블로그 작성자가 Vercel을 사용했나요?',
          operation: 'answer',
          target: {
            kind: 'none',
            sourceCategory: null,
            slug: null,
            title: null,
          },
          temporalConstraint: { order: 'none' },
          requestedFields: ['content'],
          evidenceScope: 'entity',
          requiredConcepts: ['Vercel'],
          optionalConcepts: [],
          missingSlots: ['target'],
          clarificationQuestion: '누구를 가리키는지 알려주세요.',
          confidence: 'low',
          reason: 'The target is missing.',
        },
      },
    }

    const result = await runStatefulBlogChatPipeline({
      request: buildRequest(clarificationState),
      assistantProfile: null,
      contactProfile: null,
      dependencies,
    })

    expect(dependencies.executeIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: expect.objectContaining({
          standaloneQuestion: '블로그 작성자가 Vercel을 사용했나요?',
          target: OWNER_TARGET,
          requiredConcepts: ['Vercel'],
          missingSlots: [],
        }),
      }),
    )
    expect(
      result.applicationResponse.conversationState.pendingClarification,
    ).toBeNull()
  })

  it('planner가 실패해도 완전한 상태에서 Intent를 복원한다', async () => {
    const dependencies = buildDependencies()
    const resolvedState: ChatConversationState = {
      ...EMPTY_CHAT_CONVERSATION_STATE,
      resolvedTarget: OWNER_TARGET,
      activeOperation: 'answer',
      requestedFields: ['content'],
      requiredConcepts: ['Vercel'],
      evidenceScope: 'entity',
      lastResolvedQuestion: '이윤수가 Vercel을 사용했나요?',
    }
    dependencies.planIntentPatch.mockResolvedValueOnce({
      ok: false,
      refusalReason: 'model_error',
      failureKind: 'planner_unavailable',
    })

    await runStatefulBlogChatPipeline({
      request: buildRequest(resolvedState),
      assistantProfile: null,
      contactProfile: null,
      dependencies,
    })

    expect(dependencies.executeIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: expect.objectContaining({
          target: OWNER_TARGET,
          requiredConcepts: ['Vercel'],
        }),
      }),
    )
  })

  it('grounded 응답만 의미 기반 cache에 저장한다', async () => {
    const dependencies = buildDependencies()

    await runStatefulBlogChatPipeline({
      request: buildRequest(),
      assistantProfile: null,
      contactProfile: null,
      dependencies,
    })

    expect(dependencies.setCachedResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        responseData: expect.objectContaining({ grounded: true }),
      }),
    )
    expect(dependencies.storeSemanticResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        intentCacheKey: expect.any(String),
      }),
    )
  })
})
