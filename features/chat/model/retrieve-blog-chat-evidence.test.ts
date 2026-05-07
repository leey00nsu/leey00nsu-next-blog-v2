import { beforeEach, describe, expect, it, vi } from 'vitest'
import { retrieveBlogChatEvidence } from '@/features/chat/model/retrieve-blog-chat-evidence'

const {
  getCuratedChatSourcesMock,
  resolveChatRequestMock,
  runChatRagWorkflowMock,
  shouldRunHybridRetrievalMock,
} = vi.hoisted(() => {
    return {
      getCuratedChatSourcesMock: vi.fn(),
      resolveChatRequestMock: vi.fn(),
      runChatRagWorkflowMock: vi.fn(),
      shouldRunHybridRetrievalMock: vi.fn(),
    }
})

vi.mock('@/entities/post/config/blog-search-records.generated', () => {
  return {
    GENERATED_BLOG_SEARCH_RECORDS: {
      ko: [
        {
          id: 'ko/blog/sample',
          locale: 'ko',
          slug: 'sample',
          title: 'Sample',
          url: '/ko/blog/sample',
          excerpt: 'sample',
          content: 'sample',
          sectionTitle: null,
          tags: ['sample'],
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

vi.mock('@/features/chat/lib/resolve-chat-request', () => {
  return {
    resolveChatRequest: resolveChatRequestMock,
  }
})

vi.mock('@/features/chat/lib/chat-question-plan-routing', () => {
  return {
    applyQuestionPlanToAnalysis: ({ questionAnalysis }: { questionAnalysis: unknown }) =>
      questionAnalysis,
    buildQuestionRoutingFromPlan: () => ({ selector: 'retrieval' }),
    resolvePlannerCurrentPostSlug: () => {},
    shouldRunHybridRetrieval: shouldRunHybridRetrievalMock,
  }
})

vi.mock('@/features/chat/model/chat-rag-workflow', () => {
  return {
    runChatRagWorkflow: runChatRagWorkflowMock,
  }
})

vi.mock('@/features/chat/lib/question-analysis', () => {
  return {
    analyzeQuestion: () => ({
      normalizedQuestion: 'sample question',
      questionType: 'general',
      searchQueries: [
        {
          question: 'sample question',
          intent: 'general',
          additionalKeywords: [],
          preferredSourceCategories: [],
        },
      ],
    }),
  }
})

const QUESTION_PLAN = {
  standaloneQuestion: 'sample question',
  action: 'answer' as const,
  route: 'retrieve' as const,
  directAction: 'none' as const,
  retrievalScope: 'entity' as const,
  referenceTarget: {
    kind: 'named_entity' as const,
    sourceCategory: null,
    slug: null,
    title: null,
    confidence: 'medium' as const,
  },
  preferredSourceCategories: [],
  additionalKeywords: [],
  clarificationQuestion: null,
  reason: 'retrieval',
}

describe('retrieveBlogChatEvidence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCuratedChatSourcesMock.mockResolvedValue([])
    shouldRunHybridRetrievalMock.mockReturnValue(false)
    runChatRagWorkflowMock.mockResolvedValue({
      grounded: false,
      matches: [],
    })
  })

  it('블로그/curated source로 lexical evidence를 조회하고 final matches를 반환한다', async () => {
    const match = {
      id: 'ko/blog/sample',
      locale: 'ko',
      slug: 'sample',
      title: 'Sample',
      url: '/ko/blog/sample',
      excerpt: 'sample',
      content: 'sample',
      sectionTitle: null,
      tags: ['sample'],
      sourceCategory: 'blog' as const,
    }
    resolveChatRequestMock.mockReturnValueOnce({
      normalizedQuestion: 'sample question',
      questionType: 'general',
      shouldCallModel: true,
      matches: [match],
    })

    const result = await retrieveBlogChatEvidence({
      question: 'sample question',
      locale: 'ko',
      questionPlan: QUESTION_PLAN,
      contactProfile: null,
      conversationHistoryCount: 0,
    })

    expect(resolveChatRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        blogRecords: [match],
        curatedRecords: [],
      }),
    )
    expect(result.finalMatches).toEqual([match])
    expect(result.semanticMatches).toEqual([])
    expect(result.reranked).toBe(false)
  })

  it('semantic 결과가 있어도 lexical curated 근거가 더 직접적이면 final matches에서 우선한다', async () => {
    const profileTechStackMatch = {
      id: 'ko/about/profile-tech-stack',
      locale: 'ko' as const,
      slug: 'about',
      title: 'About Me',
      url: '/ko/about',
      excerpt: '주력 기술 스택 Next.js TypeScript Tailwind CSS Prisma PostgreSQL',
      content: '주력 기술 스택 Next.js TypeScript Tailwind CSS Prisma PostgreSQL',
      sectionTitle: '주력 기술 스택',
      tags: ['profile'],
      searchTerms: ['주력 기술 스택', '기술 스택', 'Next.js', 'TypeScript'],
      sourceCategory: 'profile' as const,
    }
    const weakSemanticMatch = {
      id: 'ko/about/likelion',
      locale: 'ko' as const,
      slug: 'about',
      title: 'About Me',
      url: '/ko/about',
      excerpt: '프론트엔드 멤버와 운영진으로 활동했습니다.',
      content: '프론트엔드 멤버와 운영진으로 활동했습니다.',
      sectionTitle: '멋쟁이사자처럼',
      tags: ['profile'],
      sourceCategory: 'profile' as const,
    }

    shouldRunHybridRetrievalMock.mockReturnValueOnce(true)
    resolveChatRequestMock.mockReturnValueOnce({
      normalizedQuestion: '이윤수의 주력 기술 스택은 무엇인가요?',
      questionType: 'general',
      shouldCallModel: true,
      matches: [profileTechStackMatch],
    })
    runChatRagWorkflowMock.mockResolvedValueOnce({
      grounded: true,
      matches: [weakSemanticMatch],
    })

    const result = await retrieveBlogChatEvidence({
      question: '이윤수의 주력 기술 스택은 뭐야?',
      locale: 'ko',
      questionPlan: {
        ...QUESTION_PLAN,
        standaloneQuestion: '이윤수의 주력 기술 스택은 무엇인가요?',
        referenceTarget: {
          kind: 'profile',
          sourceCategory: 'profile',
          slug: 'about',
          title: 'About Me',
          confidence: 'high',
        },
        preferredSourceCategories: ['profile', 'project'],
        additionalKeywords: ['주력 기술 스택', '기술 스택'],
      },
      contactProfile: null,
      conversationHistoryCount: 0,
    })

    expect(result.semanticMatches).toEqual([weakSemanticMatch])
    expect(result.finalMatches[0]?.id).toBe('ko/about/profile-tech-stack')
  })
})
