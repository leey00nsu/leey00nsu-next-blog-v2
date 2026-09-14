import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BlogChatResponse } from '@/features/chat/model/chat-schema'
import {
  cleanupExpiredBlogChatResponseCache,
  getCachedBlogChatResponse,
  setCachedBlogChatResponse,
} from '@/features/chat/model/blog-chat-response-cache'

// 프로세스 메모리 경로를 검증하는 테스트이므로 공유 저장소는 사용하지 않는다.
vi.mock('@/features/chat/model/chat-response-cache-store', () => {
  return {
    deleteExpiredSharedChatResponses: vi.fn(),
    isSharedChatResponseCacheConfigured: () => false,
    saveSharedExactChatResponse: vi.fn(),
    saveSharedSemanticChatResponse: vi.fn(),
    selectSharedChatResponse: vi.fn(),
    selectSharedSemanticChatResponse: vi.fn(),
  }
})

const RESPONSE: BlogChatResponse = {
  answer: 'cached answer',
  citations: [],
  grounded: false,
}

describe('blog chat response cache', () => {
  beforeEach(async () => {
    await cleanupExpiredBlogChatResponseCache({
      now: Number.POSITIVE_INFINITY,
      ttlMilliseconds: 0,
    })
  })

  it('캐시된 응답을 키로 다시 조회한다', async () => {
    await setCachedBlogChatResponse({
      cacheKey: 'ko:global:question',
      locale: 'ko',
      responseData: RESPONSE,
      now: 100,
    })

    await expect(
      getCachedBlogChatResponse('ko:global:question'),
    ).resolves.toEqual(RESPONSE)
  })

  it('TTL을 지난 응답을 정리한다', async () => {
    await setCachedBlogChatResponse({
      cacheKey: 'expired',
      locale: 'ko',
      responseData: RESPONSE,
      now: 100,
    })

    await cleanupExpiredBlogChatResponseCache({
      now: 1001,
      ttlMilliseconds: 900,
    })

    await expect(getCachedBlogChatResponse('expired')).resolves.toBeNull()
  })

  it('TTL 이내 응답은 유지한다', async () => {
    await setCachedBlogChatResponse({
      cacheKey: 'fresh',
      locale: 'ko',
      responseData: RESPONSE,
      now: 100,
    })

    await cleanupExpiredBlogChatResponseCache({
      now: 999,
      ttlMilliseconds: 900,
    })

    await expect(getCachedBlogChatResponse('fresh')).resolves.toEqual(RESPONSE)
  })
})
