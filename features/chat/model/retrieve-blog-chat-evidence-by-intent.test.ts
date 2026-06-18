import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NormalizedChatIntent } from '@/features/chat/model/chat-intent'
import { retrieveBlogChatEvidenceByIntent } from '@/features/chat/model/retrieve-blog-chat-evidence'

const {
  getCuratedChatSourcesMock,
  resolveChatIntentRequestMock,
  runChatRagWorkflowMock,
  selectFinalChatEvidenceForIntentMock,
  shouldRerankChatIntentEvidenceMock,
} = vi.hoisted(() => {
  return {
    getCuratedChatSourcesMock: vi.fn(),
    resolveChatIntentRequestMock: vi.fn(),
    runChatRagWorkflowMock: vi.fn(),
    selectFinalChatEvidenceForIntentMock: vi.fn(),
    shouldRerankChatIntentEvidenceMock: vi.fn(),
  }
})

vi.mock('@/entities/post/config/blog-search-records.generated', () => {
  return {
    GENERATED_BLOG_SEARCH_RECORDS: {
      ko: [
        {
          id: 'ko/blog/vercel',
          locale: 'ko',
          slug: 'vercel',
          title: 'Vercel 사용 경험',
          url: '/ko/blog/vercel',
          excerpt: 'Vercel 경험',
          content: 'Vercel을 통해 배포했습니다.',
          sectionTitle: null,
          tags: ['vercel'],
        },
      ],
    },
  }
})

vi.mock('@/features/chat/model/get-curated-chat-sources', () => {
  return {
    getCuratedChatSources: getCuratedChatSourcesMock,
  }
})

vi.mock('@/features/chat/lib/resolve-chat-intent-request', () => {
  return {
    resolveChatIntentRequest: resolveChatIntentRequestMock,
  }
})

vi.mock('@/features/chat/model/chat-rag-workflow', () => {
  return {
    runChatRagWorkflow: runChatRagWorkflowMock,
  }
})

vi.mock('@/features/chat/lib/select-final-chat-evidence', () => {
  return {
    selectFinalChatEvidence: vi.fn(),
    selectFinalChatEvidenceForIntent: selectFinalChatEvidenceForIntentMock,
  }
})

vi.mock('@/features/chat/lib/should-rerank-chat-evidence', () => {
  return {
    shouldRerankChatEvidence: vi.fn(() => false),
    shouldRerankChatIntentEvidence: shouldRerankChatIntentEvidenceMock,
  }
})

const INTENT: NormalizedChatIntent = {
  standaloneQuestion: '이윤수가 Vercel을 사용했나요?',
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
  optionalConcepts: ['배포'],
  missingSlots: [],
  clarificationQuestion: null,
  confidence: 'high',
  reason: 'Author technology experience.',
}

const LEXICAL_MATCH = {
  id: 'ko/blog/vercel',
  locale: 'ko' as const,
  slug: 'vercel',
  title: 'Vercel 사용 경험',
  url: '/ko/blog/vercel',
  excerpt: 'Vercel 경험',
  content: 'Vercel을 통해 배포했습니다.',
  sectionTitle: null,
  tags: ['vercel'],
  sourceCategory: 'blog' as const,
}

describe('retrieveBlogChatEvidenceByIntent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCuratedChatSourcesMock.mockResolvedValue([])
    runChatRagWorkflowMock.mockResolvedValue({ matches: [] })
    shouldRerankChatIntentEvidenceMock.mockReturnValue(false)
    selectFinalChatEvidenceForIntentMock.mockImplementation(
      ({ lexicalMatches }: { lexicalMatches: unknown[] }) => lexicalMatches,
    )
  })

  it('Intent를 lexical request와 final evidence 선택에 전달한다', async () => {
    resolveChatIntentRequestMock.mockReturnValue({
      normalizedQuestion: INTENT.standaloneQuestion,
      questionType: 'general',
      shouldCallModel: true,
      matches: [LEXICAL_MATCH],
    })

    const result = await retrieveBlogChatEvidenceByIntent({
      intent: INTENT,
      locale: 'ko',
      conversationHistoryCount: 0,
    })

    expect(resolveChatIntentRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({ intent: INTENT }),
    )
    expect(selectFinalChatEvidenceForIntentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: INTENT,
        lexicalMatches: [LEXICAL_MATCH],
      }),
    )
    expect(result.finalMatches).toEqual([LEXICAL_MATCH])
  })

  it('semantic 결과를 Intent 기반 final evidence 선택에 병합한다', async () => {
    const semanticMatch = {
      ...LEXICAL_MATCH,
      id: 'ko/blog/vercel/semantic',
    }
    resolveChatIntentRequestMock.mockReturnValue({
      normalizedQuestion: INTENT.standaloneQuestion,
      questionType: 'general',
      shouldCallModel: true,
      matches: [LEXICAL_MATCH],
    })
    runChatRagWorkflowMock.mockResolvedValue({ matches: [semanticMatch] })
    selectFinalChatEvidenceForIntentMock.mockReturnValue([
      LEXICAL_MATCH,
      semanticMatch,
    ])

    const result = await retrieveBlogChatEvidenceByIntent({
      intent: INTENT,
      locale: 'ko',
      conversationHistoryCount: 1,
    })

    expect(runChatRagWorkflowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        question: INTENT.standaloneQuestion,
      }),
    )
    expect(result.semanticMatches).toEqual([semanticMatch])
    expect(result.finalMatches).toEqual([LEXICAL_MATCH, semanticMatch])
  })
})
