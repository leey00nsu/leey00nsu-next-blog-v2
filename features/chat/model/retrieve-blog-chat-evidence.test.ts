import { beforeEach, describe, expect, it, vi } from 'vitest'
import { retrieveBlogChatEvidence } from '@/features/chat/model/retrieve-blog-chat-evidence'

const { getCuratedChatSourcesMock, resolveChatRequestMock } = vi.hoisted(
  () => {
    return {
      getCuratedChatSourcesMock: vi.fn(),
      resolveChatRequestMock: vi.fn(),
    }
  },
)

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
    shouldRunHybridRetrieval: () => false,
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
  socialPreamble: false,
  action: 'answer' as const,
  scope: 'global' as const,
  deterministicAction: 'none' as const,
  needsRetrieval: true,
  retrievalMode: 'standard' as const,
  preferredSourceCategories: [],
  additionalKeywords: [],
  needsClarification: false,
  clarificationQuestion: null,
  reason: 'retrieval',
}

describe('retrieveBlogChatEvidence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCuratedChatSourcesMock.mockResolvedValue([])
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
})
