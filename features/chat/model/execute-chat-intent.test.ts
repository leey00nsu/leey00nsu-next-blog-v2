import { describe, expect, it, vi } from 'vitest'
import type { NormalizedChatIntent } from '@/features/chat/model/chat-intent'
import { executeChatIntent } from '@/features/chat/model/execute-chat-intent'

const BASE_INTENT: NormalizedChatIntent = {
  standaloneQuestion: 'Vercel 사용 경험을 알려주세요.',
  operation: 'answer',
  target: {
    kind: 'profile',
    sourceCategory: 'profile',
    slug: 'about',
    title: '이윤수',
  },
  temporalConstraint: { order: 'none' },
  requestedFields: ['content'],
  evidenceScope: 'entity',
  requiredConcepts: ['Vercel'],
  optionalConcepts: [],
  missingSlots: [],
  clarificationQuestion: null,
  confidence: 'high',
  reason: 'Complete question.',
}

const MATCH = {
  id: 'ko/blog/vercel',
  locale: 'ko' as const,
  slug: 'vercel',
  title: 'Vercel 사용 경험',
  url: '/ko/blog/vercel',
  excerpt: 'Vercel 경험',
  content: 'Vercel로 배포했습니다.',
  sectionTitle: null,
  tags: ['vercel'],
  sourceCategory: 'blog' as const,
}

function buildEvidenceResult(params: {
  shouldCallModel: boolean
  directResponse?: {
    answer: string
    grounded: boolean
    citations: []
  }
  matches?: typeof MATCH[]
  refusalReason?: 'insufficient_search_match'
}) {
  const matches = params.matches ?? []

  return {
    resolvedChatRequest: {
      normalizedQuestion: BASE_INTENT.standaloneQuestion,
      questionType: 'general' as const,
      shouldCallModel: params.shouldCallModel,
      matches,
      directResponse: params.directResponse,
      refusalReason: params.refusalReason,
    },
    retrievalScope: {
      mode: 'entity' as const,
      sourceCategory: 'profile' as const,
      slug: 'about',
      title: '이윤수',
    },
    lexicalMatches: matches,
    semanticMatches: [],
    finalMatches: matches,
    reranked: false,
  }
}

describe('executeChatIntent', () => {
  it('missing slot이 있으면 검색하지 않고 명확화 응답을 반환한다', async () => {
    const retrieveEvidence = vi.fn()

    const result = await executeChatIntent({
      intent: {
        ...BASE_INTENT,
        target: {
          kind: 'none',
          sourceCategory: null,
          slug: null,
          title: null,
        },
        missingSlots: ['target'],
        clarificationQuestion: '누구를 가리키는지 알려주세요.',
      },
      locale: 'ko',
      conversationHistoryCount: 0,
      retrieveEvidence,
    })

    expect(result).toMatchObject({
      kind: 'direct',
      response: {
        answer: '누구를 가리키는지 알려주세요.',
      },
    })
    expect(retrieveEvidence).not.toHaveBeenCalled()
  })

  it('social reply는 검색하지 않고 챗봇 인사말을 반환한다', async () => {
    const retrieveEvidence = vi.fn()
    const result = await executeChatIntent({
      intent: {
        ...BASE_INTENT,
        operation: 'social_reply',
        evidenceScope: 'none',
        requiredConcepts: [],
      },
      locale: 'ko',
      conversationHistoryCount: 0,
      assistantProfile: {
        title: '챗봇',
        chatbotName: '블로그 챗봇',
        ownerName: '이윤수',
        greetingAnswer: '안녕하세요. 무엇을 찾고 계신가요?',
        identityAnswer: '블로그 챗봇입니다.',
        aliases: [],
        content: '',
      },
      retrieveEvidence,
    })

    expect(result).toMatchObject({
      kind: 'direct',
      response: { answer: '안녕하세요. 무엇을 찾고 계신가요?' },
    })
    expect(retrieveEvidence).not.toHaveBeenCalled()
  })

  it('retrieval direct response를 그대로 반환한다', async () => {
    const directResponse = {
      answer: '최신 글은 최신 글입니다.',
      grounded: true,
      citations: [] as [],
    }
    const result = await executeChatIntent({
      intent: BASE_INTENT,
      locale: 'ko',
      conversationHistoryCount: 0,
      retrieveEvidence: vi.fn().mockResolvedValue(
        buildEvidenceResult({
          shouldCallModel: false,
          directResponse,
          matches: [MATCH],
        }),
      ),
    })

    expect(result).toMatchObject({
      kind: 'direct',
      response: directResponse,
      matches: [MATCH],
    })
  })

  it('근거가 있으면 모델 답변 실행 정보를 반환한다', async () => {
    const result = await executeChatIntent({
      intent: BASE_INTENT,
      locale: 'ko',
      conversationHistoryCount: 0,
      retrieveEvidence: vi.fn().mockResolvedValue(
        buildEvidenceResult({
          shouldCallModel: true,
          matches: [MATCH],
        }),
      ),
    })

    expect(result).toMatchObject({
      kind: 'model',
      question: BASE_INTENT.standaloneQuestion,
      matches: [MATCH],
    })
  })

  it('필수 근거가 없으면 검색 부족을 반환한다', async () => {
    const result = await executeChatIntent({
      intent: BASE_INTENT,
      locale: 'ko',
      conversationHistoryCount: 0,
      retrieveEvidence: vi.fn().mockResolvedValue(
        buildEvidenceResult({
          shouldCallModel: false,
          refusalReason: 'insufficient_search_match',
        }),
      ),
    })

    expect(result).toEqual({
      kind: 'refusal',
      refusalReason: 'insufficient_search_match',
      evidenceResult: expect.any(Object),
    })
  })
})
