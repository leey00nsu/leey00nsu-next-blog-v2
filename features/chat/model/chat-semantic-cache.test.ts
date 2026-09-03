import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BlogChatResponse } from '@/features/chat/model/chat-schema'

const { embedChatRagQuestionMock } = vi.hoisted(() => {
  return {
    embedChatRagQuestionMock: vi.fn(),
  }
})

vi.mock('@/features/chat/model/chat-rag-embedding-provider', () => {
  return {
    embedChatRagQuestion: embedChatRagQuestionMock,
    isChatRagEmbeddingConfigured: () => true,
  }
})

describe('chat-semantic-cache', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()

    embedChatRagQuestionMock.mockReset()
  })

  it('유사한 질문의 grounded 응답을 재사용한다', async () => {
    const {
      findSemanticCachedBlogChatResponse,
      storeSemanticCachedBlogChatResponse,
    } = await import('@/features/chat/model/chat-semantic-cache')

    const groundedResponse: BlogChatResponse = {
      answer: 'nivo를 사용한 글이 있습니다.',
      grounded: true,
      citations: [
        {
          title: 'nivo chart로 데이터 시각화하기',
          url: '/ko/blog/nivo-chart',
          sectionTitle: null,
          sourceCategory: 'blog',
        },
      ],
    }

    embedChatRagQuestionMock
      .mockResolvedValueOnce([1, 0, 0])
      .mockResolvedValueOnce([0.98, 0.02, 0])

    await storeSemanticCachedBlogChatResponse({
      locale: 'ko',
      question: 'nivo를 사용한 적 있나요?',
      response: groundedResponse,
    })

    const cachedResponse = await findSemanticCachedBlogChatResponse({
      locale: 'ko',
      question: 'nivo라는걸 쓴 적 있나요?',
    })

    expect(cachedResponse).toEqual(groundedResponse)
  })

  it('grounded가 아닌 응답은 semantic cache에 저장하지 않는다', async () => {
    const {
      findSemanticCachedBlogChatResponse,
      storeSemanticCachedBlogChatResponse,
    } = await import('@/features/chat/model/chat-semantic-cache')

    embedChatRagQuestionMock
      .mockResolvedValueOnce([1, 0, 0])
      .mockResolvedValueOnce([1, 0, 0])

    await storeSemanticCachedBlogChatResponse({
      locale: 'ko',
      question: '이건 애매한 질문',
      response: {
        answer: '',
        grounded: false,
        citations: [],
        refusalReason: 'insufficient_evidence',
      },
    })

    const cachedResponse = await findSemanticCachedBlogChatResponse({
      locale: 'ko',
      question: '이건 애매한 질문',
    })

    expect(cachedResponse).toBeUndefined()
  })

  it('질문이 유사해도 intent cache key가 다르면 응답을 공유하지 않는다', async () => {
    const {
      findSemanticCachedBlogChatResponse,
      storeSemanticCachedBlogChatResponse,
    } = await import('@/features/chat/model/chat-semantic-cache')
    const groundedResponse: BlogChatResponse = {
      answer: '이윤수는 Vercel 사용 경험이 있습니다.',
      grounded: true,
      citations: [
        {
          title: 'Vercel 사용 경험',
          url: '/ko/blog/vercel',
          sectionTitle: null,
          sourceCategory: 'blog',
        },
      ],
    }

    embedChatRagQuestionMock
      .mockResolvedValueOnce([1, 0, 0])
      .mockResolvedValueOnce([1, 0, 0])

    await storeSemanticCachedBlogChatResponse({
      locale: 'ko',
      question: '이 사람 Vercel 써봤어?',
      intentCacheKey: 'owner:vercel',
      response: groundedResponse,
    })

    const cachedResponse = await findSemanticCachedBlogChatResponse({
      locale: 'ko',
      question: '이 사람 Vercel 써봤어?',
      intentCacheKey: 'another-person:vercel',
    })

    expect(cachedResponse).toBeUndefined()
  })

  it('주입된 질문 임베딩을 사용하고 cache 실패를 요청 실패로 전파하지 않는다', async () => {
    const {
      findSemanticCachedBlogChatResponse,
      storeSemanticCachedBlogChatResponse,
    } = await import('@/features/chat/model/chat-semantic-cache')
    const groundedResponse: BlogChatResponse = {
      answer: '캐시된 답변입니다.',
      grounded: true,
      citations: [
        {
          title: '캐시 근거',
          url: '/ko/blog/cache-evidence',
          sectionTitle: null,
          sourceCategory: 'blog',
        },
      ],
    }
    const resolveQuestionEmbedding = vi
      .fn<() => Promise<number[]>>()
      .mockResolvedValueOnce([1, 0, 0])
      .mockRejectedValueOnce(new Error('embedding unavailable'))

    await storeSemanticCachedBlogChatResponse({
      locale: 'ko',
      question: '캐시할 질문',
      response: groundedResponse,
      resolveQuestionEmbedding,
    })

    await expect(
      findSemanticCachedBlogChatResponse({
        locale: 'ko',
        question: '유사한 질문',
        resolveQuestionEmbedding,
      }),
    ).resolves.toBeUndefined()
    expect(embedChatRagQuestionMock).not.toHaveBeenCalled()
  })

  it('차원이 다른 질문 embedding을 같은 semantic cache 항목으로 보지 않는다', async () => {
    const {
      findSemanticCachedBlogChatResponse,
      storeSemanticCachedBlogChatResponse,
    } = await import('@/features/chat/model/chat-semantic-cache')
    const groundedResponse: BlogChatResponse = {
      answer: '차원 검증용 답변입니다.',
      grounded: true,
      citations: [
        {
          title: '차원 검증 근거',
          url: '/ko/blog/embedding-dimension',
          sectionTitle: null,
          sourceCategory: 'blog',
        },
      ],
    }

    embedChatRagQuestionMock
      .mockResolvedValueOnce([1])
      .mockResolvedValueOnce([1, 0])

    await storeSemanticCachedBlogChatResponse({
      locale: 'ko',
      question: '저장 질문',
      response: groundedResponse,
    })

    await expect(
      findSemanticCachedBlogChatResponse({
        locale: 'ko',
        question: '조회 질문',
      }),
    ).resolves.toBeUndefined()
  })
})
