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
    const { findSemanticCachedBlogChatResponse, storeSemanticCachedBlogChatResponse } =
      await import('@/features/chat/model/chat-semantic-cache')

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
    const { findSemanticCachedBlogChatResponse, storeSemanticCachedBlogChatResponse } =
      await import('@/features/chat/model/chat-semantic-cache')

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
})
