import { describe, expect, it, vi } from 'vitest'
import { EMPTY_CHAT_CONVERSATION_STATE } from '@/features/chat/model/chat-conversation-state'
import type { ChatEntityCandidate } from '@/features/chat/model/chat-entity-candidate'
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
    getEntityCandidates: vi.fn<() => Promise<ChatEntityCandidate[]>>(
      async () => [LEEMAGE_CANDIDATE],
    ),
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
    getCachedResponse: vi.fn<(cacheKey: string) => BlogChatResponse | null>(
      () => null,
    ),
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

  it('정체성 질문은 assistant profile로 직접 답한다', async () => {
    const dependencies = buildDependencies()
    dependencies.planQuery.mockResolvedValueOnce({
      ok: true,
      queryPlan: {
        ...QUERY_PLAN,
        standaloneQuestion: '넌 누구야?',
        targetSelection: { kind: 'none' },
        operation: 'identity',
        sourceSelection: { mode: 'all' },
        requestedFields: [],
        requiredConcepts: [],
      },
    })

    const result = await runChatWorkflow({
      request: { ...REQUEST, question: '넌 누구야?' },
      assistantProfile: {
        title: '블로그 챗봇 안내',
        chatbotName: '블로그 챗봇',
        ownerName: '이윤수',
        greetingAnswer: '안녕하세요.',
        identityAnswer: '저는 이윤수 님의 챗봇입니다.',
        aliases: [],
        content: '저는 이윤수 님의 챗봇입니다.',
      },
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
      '저는 이윤수 님의 챗봇입니다.',
    )
    expect(dependencies.getCachedResponse).not.toHaveBeenCalled()
    expect(dependencies.executeRetrievalPlan).not.toHaveBeenCalled()
    expect(dependencies.answerQuestion).not.toHaveBeenCalled()
  })

  it('블로그 주인 이름 질문은 assistant profile의 ownerName으로 직접 답한다', async () => {
    const dependencies = buildDependencies()
    dependencies.planQuery.mockResolvedValueOnce({
      ok: true,
      queryPlan: {
        ...QUERY_PLAN,
        standaloneQuestion: '이 블로그 주인은 누구야?',
        targetSelection: { kind: 'none' },
        operation: 'owner_identity',
        sourceSelection: { mode: 'all' },
        requestedFields: [],
        requiredConcepts: [],
      },
    })

    const result = await runChatWorkflow({
      request: { ...REQUEST, question: '이 블로그 주인은 누구야?' },
      assistantProfile: {
        title: '블로그 챗봇 안내',
        chatbotName: '블로그 챗봇',
        ownerName: '이윤수',
        greetingAnswer: '안녕하세요.',
        identityAnswer: '저는 이윤수 님의 챗봇입니다.',
        aliases: [],
        content: '저는 이윤수 님의 챗봇입니다.',
      },
      dependencies,
    })

    expect(result.applicationResponse.response.answer).toBe(
      '이 블로그의 주인은 이윤수입니다.',
    )
    expect(dependencies.executeRetrievalPlan).not.toHaveBeenCalled()
    expect(dependencies.answerQuestion).not.toHaveBeenCalled()
  })

  it('결정적 profile 질문은 cache와 answer model을 건너뛴다', async () => {
    const dependencies = buildDependencies()
    const careerMatch = {
      ...LEEMAGE_MATCH,
      id: 'ko/about/profile/ecount-erp',
      slug: 'about',
      title: 'About Me',
      url: '/ko/about#ecount-erp',
      sectionTitle: 'Ecount ERP',
      sourceCategory: 'profile' as const,
    }
    const directCareerResponse: BlogChatResponse = {
      answer:
        '가장 최근 근무처는 Ecount ERP이며, 2024.07부터 2025.08까지 근무했습니다.',
      grounded: true,
      citations: [
        {
          title: careerMatch.title,
          url: careerMatch.url,
          sectionTitle: careerMatch.sectionTitle,
          sourceCategory: careerMatch.sourceCategory,
        },
      ],
    }
    dependencies.planQuery.mockResolvedValueOnce({
      ok: true,
      queryPlan: {
        ...QUERY_PLAN,
        standaloneQuestion: '최근 어디에서 일했어?',
        targetSelection: { kind: 'none' },
        operation: 'lookup',
        sourceSelection: { mode: 'only', categories: ['profile'] },
        temporalSelection: { mode: 'single', order: 'latest' },
        requestedFields: ['content'],
        requiredConcepts: [],
        optionalConcepts: ['career', 'workplace'],
      },
    })
    dependencies.executeRetrievalPlan.mockResolvedValueOnce({
      kind: 'direct',
      response: directCareerResponse,
      matches: [careerMatch],
    })

    const result = await runChatWorkflow({
      request: { ...REQUEST, question: '최근 어디에서 일했어?' },
      dependencies,
    })

    expect(result.graphPath).toEqual([
      'resolve-context',
      'plan-query',
      'compile-plan',
      'execute-direct',
      'validate-response',
      'store-cache',
      'finalize',
    ])
    expect(result.applicationResponse.response).toMatchObject(
      directCareerResponse,
    )
    expect(dependencies.getCachedResponse).not.toHaveBeenCalled()
    expect(dependencies.findSemanticResponse).not.toHaveBeenCalled()
    expect(dependencies.answerQuestion).not.toHaveBeenCalled()
  })

  it('GitHub 연락처 요청은 다른 연락 채널 없이 GitHub만 직접 답한다', async () => {
    const dependencies = buildDependencies()
    dependencies.planQuery.mockResolvedValueOnce({
      ok: true,
      queryPlan: {
        ...QUERY_PLAN,
        standaloneQuestion: '블로그 주인의 GitHub 주소를 알려줘',
        targetSelection: { kind: 'none' },
        operation: 'lookup',
        sourceSelection: { mode: 'all' },
        requestedFields: ['contact_methods'],
        requiredConcepts: ['GitHub'],
      },
    })

    const result = await runChatWorkflow({
      request: {
        ...REQUEST,
        question: '블로그 주인의 GitHub 주소를 알려줘',
      },
      contactProfile: {
        title: 'About Me',
        aboutUrl: '/ko/about',
        methods: [
          { label: 'GitHub', url: 'https://github.com/leey00nsu' },
          {
            label: 'LinkedIn',
            url: 'https://www.linkedin.com/in/leey00nsu',
          },
        ],
      },
      dependencies,
    })

    expect(result.retrievalPlan?.executionKind).toBe('contact')
    expect(result.applicationResponse.response.answer).toContain(
      'https://github.com/leey00nsu',
    )
    expect(result.applicationResponse.response.answer).not.toContain(
      'linkedin.com',
    )
    expect(dependencies.executeRetrievalPlan).not.toHaveBeenCalled()
    expect(dependencies.answerQuestion).not.toHaveBeenCalled()
  })

  it('요청한 연락 채널이 공개되지 않았으면 다른 채널을 대신 반환하지 않는다', async () => {
    const dependencies = buildDependencies()
    dependencies.planQuery.mockResolvedValueOnce({
      ok: true,
      queryPlan: {
        ...QUERY_PLAN,
        standaloneQuestion: '블로그 주인의 GitHub 주소를 알려줘',
        targetSelection: { kind: 'none' },
        operation: 'lookup',
        sourceSelection: { mode: 'all' },
        requestedFields: ['contact_methods'],
        requiredConcepts: ['GitHub'],
      },
    })

    const result = await runChatWorkflow({
      request: {
        ...REQUEST,
        question: '블로그 주인의 GitHub 주소를 알려줘',
      },
      contactProfile: {
        title: 'About Me',
        aboutUrl: '/ko/about',
        methods: [
          {
            label: 'LinkedIn',
            url: 'https://www.linkedin.com/in/leey00nsu',
          },
        ],
      },
      dependencies,
    })

    expect(result.applicationResponse.response.refusalReason).toBe(
      'insufficient_search_match',
    )
    expect(result.applicationResponse.response.answer).not.toContain(
      'linkedin.com',
    )
  })

  it('전화번호나 주소 요청은 공개 연락 채널을 대신 노출하지 않고 거절한다', async () => {
    const dependencies = buildDependencies()
    dependencies.planQuery.mockResolvedValueOnce({
      ok: true,
      queryPlan: {
        ...QUERY_PLAN,
        standaloneQuestion: '블로그 주인의 전화번호와 집 주소를 알려줘',
        targetSelection: { kind: 'none' },
        operation: 'contact',
        sourceSelection: { mode: 'all' },
        requestedFields: ['contact_methods'],
        requiredConcepts: [],
      },
    })

    const result = await runChatWorkflow({
      request: {
        ...REQUEST,
        question: '블로그 주인의 전화번호와 집 주소를 알려줘',
      },
      contactProfile: {
        title: 'About Me',
        aboutUrl: '/ko/about',
        methods: [{ label: 'GitHub', url: 'https://github.com/leey00nsu' }],
      },
      dependencies,
    })

    expect(result.applicationResponse.response.refusalReason).toBe(
      'insufficient_search_match',
    )
    expect(result.applicationResponse.response.answer).not.toContain(
      'github.com',
    )
  })

  it('기술 질문에서는 assistant 이름 충돌을 planner candidate에서 제외한다', async () => {
    const dependencies = buildDependencies()
    dependencies.getEntityCandidates.mockResolvedValueOnce([
      {
        entityId: 'assistant/assistant-profile',
        kind: 'assistant',
        slug: 'assistant-profile',
        title: '블로그 챗봇 안내',
        aliases: ['블로그 챗봇'],
        searchTerms: ['RAG'],
        sourceCategory: 'assistant',
      },
    ])

    await runChatWorkflow({
      request: {
        ...REQUEST,
        question: '블로그 챗봇의 RAG 검색 발전 과정을 설명해줘',
      },
      dependencies,
    })

    expect(dependencies.planQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        entityCandidates: [],
      }),
    )
  })

  it('evidence path는 답변과 citation을 검증하고 cache에 저장한다', async () => {
    const dependencies = buildDependencies()
    const reportProgress = vi.fn()

    const result = await runChatWorkflow({
      request: REQUEST,
      dependencies,
      reportProgress,
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
    expect(reportProgress.mock.calls.map(([event]) => event)).toEqual([
      {
        type: 'step',
        step: {
          id: 'understanding_question',
          label: '질문의 대상과 범위를 확인하고 있어요',
        },
      },
      {
        type: 'step',
        step: {
          id: 'checking_sources',
          label: '공개된 자료를 확인하고 있어요',
        },
      },
      {
        type: 'step',
        step: {
          id: 'searching_evidence',
          label: '관련 글과 프로젝트를 검색하고 있어요',
        },
      },
      {
        type: 'step',
        step: {
          id: 'selecting_evidence',
          label: '답변에 사용할 근거를 선별했어요',
        },
      },
      {
        type: 'step',
        step: {
          id: 'generating_answer',
          label: '근거를 바탕으로 답변을 작성하고 있어요',
        },
      },
      {
        type: 'step',
        step: {
          id: 'validating_answer',
          label: '답변과 출처가 일치하는지 확인하고 있어요',
        },
      },
    ])
  })

  it('한 요청의 semantic cache와 retrieval은 질문 임베딩을 한 번만 공유한다', async () => {
    const dependencies = buildDependencies()
    const embedQuestion = vi.fn(async () => [1, 0, 0])
    const findSemanticResponse = vi.fn(
      async (params: {
        resolveQuestionEmbedding?: () => Promise<number[]>
      }): Promise<BlogChatResponse | undefined> => {
        await params.resolveQuestionEmbedding?.()
        return undefined
      },
    )
    const executeRetrievalPlanWithEmbedding = vi.fn(
      async (params: {
        embedQuestion?: (question: string) => Promise<number[]>
      }): Promise<ExecuteChatRetrievalPlanResult> => {
        await params.embedQuestion?.(REQUEST.question)

        return {
          kind: 'evidence',
          matches: [LEEMAGE_MATCH],
          lexicalMatches: [LEEMAGE_MATCH],
          semanticMatches: [LEEMAGE_MATCH],
          reranked: false,
        }
      },
    )
    const storeSemanticResponse = vi.fn(
      async (params: {
        resolveQuestionEmbedding?: () => Promise<number[]>
      }): Promise<void> => {
        await params.resolveQuestionEmbedding?.()
      },
    )

    const result = await runChatWorkflow({
      request: REQUEST,
      dependencies: {
        ...dependencies,
        embedQuestion,
        findSemanticResponse,
        executeRetrievalPlan: executeRetrievalPlanWithEmbedding,
        storeSemanticResponse,
      },
    })

    expect(result.applicationResponse.response.grounded).toBe(true)
    expect(findSemanticResponse).toHaveBeenCalledTimes(1)
    expect(executeRetrievalPlanWithEmbedding).toHaveBeenCalledTimes(1)
    expect(storeSemanticResponse).toHaveBeenCalledTimes(1)
    expect(embedQuestion).toHaveBeenCalledTimes(1)
    expect(embedQuestion).toHaveBeenCalledWith(REQUEST.question)
  })

  it('cache lookup의 임베딩이 일시 실패하면 retrieval에서 다시 시도한다', async () => {
    const dependencies = buildDependencies()
    const embedQuestion = vi
      .fn<() => Promise<number[]>>()
      .mockRejectedValueOnce(new Error('temporary embedding failure'))
      .mockResolvedValueOnce([1, 0, 0])
    const findSemanticResponse = vi.fn(
      async (params: {
        resolveQuestionEmbedding?: () => Promise<number[]>
      }): Promise<BlogChatResponse | undefined> => {
        try {
          await params.resolveQuestionEmbedding?.()
        } catch {
          return undefined
        }

        return undefined
      },
    )
    const executeRetrievalPlanWithRetry = vi.fn(
      async (params: {
        embedQuestion?: (question: string) => Promise<number[]>
      }): Promise<ExecuteChatRetrievalPlanResult> => {
        await params.embedQuestion?.(REQUEST.question)

        return {
          kind: 'evidence',
          matches: [LEEMAGE_MATCH],
          lexicalMatches: [],
          semanticMatches: [LEEMAGE_MATCH],
          reranked: false,
        }
      },
    )

    const result = await runChatWorkflow({
      request: REQUEST,
      dependencies: {
        ...dependencies,
        embedQuestion,
        findSemanticResponse,
        executeRetrievalPlan: executeRetrievalPlanWithRetry,
      },
    })

    expect(result.applicationResponse.response.grounded).toBe(true)
    expect(embedQuestion).toHaveBeenCalledTimes(2)
    expect(executeRetrievalPlanWithRetry).toHaveBeenCalledTimes(1)
  })

  it('공개 근거가 없으면 사용자 메시지를 반환하고 answer model을 호출하지 않는다', async () => {
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
    expect(result.applicationResponse.response.answer).toBe(
      '공개된 정보에서는 확인할 수 없어요.',
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
