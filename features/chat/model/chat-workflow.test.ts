import { describe, expect, it, vi } from 'vitest'
import { EMPTY_CHAT_CONVERSATION_STATE } from '@/features/chat/model/chat-conversation-state'
import type { ChatQueryPlan } from '@/features/chat/model/chat-query-plan'
import type { ChatRetrievalPlan } from '@/features/chat/model/chat-retrieval-plan'
import type { ExecuteChatRetrievalPlanResult } from '@/features/chat/model/execute-chat-retrieval-plan'
import type {
  BlogChatRequest,
  BlogChatResponse,
} from '@/features/chat/model/chat-schema'
import { runChatWorkflow } from '@/features/chat/model/chat-workflow'

const REQUEST: BlogChatRequest = {
  question: 'Leemage에서 Presigned URL을 사용한 이유는?',
  locale: 'ko',
  conversationHistory: [],
  conversationState: EMPTY_CHAT_CONVERSATION_STATE,
}

const QUERY_PLAN: ChatQueryPlan = {
  standaloneQuestion: REQUEST.question,
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
  reason: 'Explicit project explanation.',
}

const LEEMAGE_CANDIDATE = {
  entityId: 'project/leemage',
  kind: 'project' as const,
  slug: 'leemage',
  title: 'Leemage',
  aliases: ['Leemage'],
  searchTerms: ['Presigned URL'],
  sourceCategory: 'project' as const,
}

const LEEMAGE_MATCH = {
  id: 'ko/project/leemage/solution',
  locale: 'ko' as const,
  slug: 'leemage',
  title: 'Leemage',
  url: '/ko/projects/leemage#solution',
  excerpt: 'Presigned URL',
  content: 'Presigned URL로 클라이언트가 직접 업로드합니다.',
  sectionTitle: 'Solution',
  tags: ['project', 'presigned url'],
  searchTerms: ['Presigned URL'],
  sourceCategory: 'project' as const,
}

const GROUNDED_RESPONSE: BlogChatResponse = {
  answer: 'Presigned URL로 서버 부하를 줄였습니다.',
  grounded: true,
  citations: [
    {
      title: LEEMAGE_MATCH.title,
      url: LEEMAGE_MATCH.url,
      sectionTitle: LEEMAGE_MATCH.sectionTitle,
      sourceCategory: LEEMAGE_MATCH.sourceCategory,
    },
  ],
}

function buildDependencies() {
  return {
    getEntityCandidates: vi.fn(async () => [LEEMAGE_CANDIDATE]),
    planQuery: vi.fn(async () => ({
      ok: true as const,
      queryPlan: QUERY_PLAN,
    })),
    executeRetrievalPlan: vi.fn<
      (params: {
        plan: ChatRetrievalPlan
        locale: BlogChatRequest['locale']
      }) => Promise<ExecuteChatRetrievalPlanResult>
    >(async () => ({
      kind: 'evidence',
      matches: [LEEMAGE_MATCH],
      lexicalMatches: [LEEMAGE_MATCH],
      semanticMatches: [],
      reranked: false,
    })),
    answerQuestion: vi.fn(async () => ({
      ok: true,
      draftAnswer: {
        answer: GROUNDED_RESPONSE.answer,
        usedCitationUrls: [LEEMAGE_MATCH.url],
        refusalReason: null,
      },
    })),
    getCachedResponse: vi.fn<
      (cacheKey: string) => BlogChatResponse | null
    >(() => null),
    setCachedResponse: vi.fn(),
    findSemanticResponse: vi.fn(
      async (): Promise<BlogChatResponse | undefined> => {
        return ([] as BlogChatResponse[]).at(0)
      },
    ),
    storeSemanticResponse: vi.fn(() => Promise.resolve()),
  }
}

describe('runChatWorkflow', () => {
  it('cache hit은 retrieval과 answer model을 건너뛴다', async () => {
    const dependencies = buildDependencies()
    dependencies.getCachedResponse.mockReturnValueOnce(GROUNDED_RESPONSE)

    const result = await runChatWorkflow({
      request: REQUEST,
      dependencies,
    })

    expect(result.graphPath).toEqual([
      'resolve-context',
      'plan-query',
      'compile-plan',
      'cache-lookup',
      'finalize',
    ])
    expect(result.cacheKind).toBe('exact')
    expect(dependencies.executeRetrievalPlan).not.toHaveBeenCalled()
    expect(dependencies.answerQuestion).not.toHaveBeenCalled()
  })

  it('clarification은 cache와 retrieval을 호출하지 않는다', async () => {
    const dependencies = buildDependencies()
    dependencies.planQuery.mockResolvedValueOnce({
      ok: true,
      queryPlan: {
        ...QUERY_PLAN,
        targetSelection: { kind: 'none' },
        sourceSelection: { mode: 'all' },
        missingSlots: ['target'],
        clarificationQuestion: '누구를 가리키는지 알려주세요.',
      },
    })

    const result = await runChatWorkflow({
      request: REQUEST,
      dependencies,
    })

    expect(result.graphPath).toEqual([
      'resolve-context',
      'plan-query',
      'compile-plan',
      'execute-direct',
      'validate-response',
      'finalize',
    ])
    expect(result.applicationResponse.response.answer).toBe(
      '누구를 가리키는지 알려주세요.',
    )
    expect(dependencies.getCachedResponse).not.toHaveBeenCalled()
    expect(dependencies.executeRetrievalPlan).not.toHaveBeenCalled()
  })

  it('evidence path는 답변과 citation을 검증하고 cache에 저장한다', async () => {
    const dependencies = buildDependencies()

    const result = await runChatWorkflow({
      request: REQUEST,
      dependencies,
    })

    expect(result.graphPath).toEqual([
      'resolve-context',
      'plan-query',
      'compile-plan',
      'cache-lookup',
      'retrieve-evidence',
      'generate-answer',
      'validate-response',
      'store-cache',
      'finalize',
    ])
    expect(result.applicationResponse.response).toMatchObject({
      grounded: true,
      citations: [expect.objectContaining({ url: LEEMAGE_MATCH.url })],
    })
    expect(dependencies.answerQuestion).toHaveBeenCalledWith({
      question: QUERY_PLAN.standaloneQuestion,
      matches: [LEEMAGE_MATCH],
    })
    expect(dependencies.setCachedResponse).toHaveBeenCalledTimes(1)
    expect(dependencies.storeSemanticResponse).toHaveBeenCalledTimes(1)
  })

  it('insufficient evidence는 answer model을 호출하지 않는다', async () => {
    const dependencies = buildDependencies()
    dependencies.executeRetrievalPlan.mockResolvedValueOnce({
      kind: 'refusal',
      refusalReason: 'insufficient_search_match',
      matches: [] as [],
    })

    const result = await runChatWorkflow({
      request: REQUEST,
      dependencies,
    })

    expect(result.graphPath).toContain('retrieve-evidence')
    expect(result.graphPath).not.toContain('generate-answer')
    expect(result.applicationResponse.response.refusalReason).toBe(
      'insufficient_search_match',
    )
    expect(dependencies.answerQuestion).not.toHaveBeenCalled()
  })

  it('compiler 실패는 이전 conversation state를 유지한다', async () => {
    const dependencies = buildDependencies()
    dependencies.planQuery.mockResolvedValueOnce({
      ok: true,
      queryPlan: {
        ...QUERY_PLAN,
        targetSelection: { kind: 'candidate', entityId: 'project/unknown' },
      },
    })

    const result = await runChatWorkflow({
      request: REQUEST,
      dependencies,
    })

    expect(result.failureKind).toBe('invalid_candidate')
    expect(result.applicationResponse.conversationState).toEqual(
      REQUEST.conversationState,
    )
    expect(dependencies.executeRetrievalPlan).not.toHaveBeenCalled()
  })
})
