import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BLOG_CHAT } from '@/features/chat/config/constants'
import type { BlogChatResponse } from '@/features/chat/model/chat-schema'
import {
  cleanupExpiredBlogChatResponseCache,
  getCachedBlogChatResponse,
  setCachedBlogChatResponse,
} from '@/features/chat/model/blog-chat-response-cache'

const { sharedCacheStoreMock } = vi.hoisted(() => {
  return {
    sharedCacheStoreMock: {
      deleteExpiredSharedChatResponses: vi.fn(),
      isSharedChatResponseCacheConfigured: vi.fn(() => false),
      saveSharedExactChatResponse: vi.fn(),
      selectSharedChatResponse: vi.fn(),
    },
  }
})

vi.mock('@/features/chat/model/chat-response-cache-store', () => {
  return sharedCacheStoreMock
})

const RESPONSE: BlogChatResponse = {
  answer: 'cached answer',
  citations: [],
  grounded: false,
}

describe('blog chat response cache', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(100)
    sharedCacheStoreMock.isSharedChatResponseCacheConfigured.mockReset()
    sharedCacheStoreMock.isSharedChatResponseCacheConfigured.mockReturnValue(
      false,
    )
    sharedCacheStoreMock.selectSharedChatResponse.mockReset()
    sharedCacheStoreMock.saveSharedExactChatResponse.mockReset()
    sharedCacheStoreMock.deleteExpiredSharedChatResponses.mockReset()

    await cleanupExpiredBlogChatResponseCache({
      now: Number.POSITIVE_INFINITY,
      ttlMilliseconds: 0,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('별도 정리 없이도 TTL 경계에서 만료 응답을 반환하지 않는다', async () => {
    await setCachedBlogChatResponse({
      cacheKey: 'ttl-boundary',
      locale: 'ko',
      responseData: RESPONSE,
    })
    vi.setSystemTime(100 + BLOG_CHAT.CACHE.TTL_MILLISECONDS)
    await expect(getCachedBlogChatResponse('ttl-boundary')).resolves.toBeNull()
  })

  it('공유 정리가 성공한 뒤 조회가 실패해도 만료된 대체 캐시는 반환하지 않는다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    sharedCacheStoreMock.isSharedChatResponseCacheConfigured.mockReturnValue(
      true,
    )
    sharedCacheStoreMock.saveSharedExactChatResponse.mockRejectedValueOnce(
      new Error('unavailable'),
    )
    await setCachedBlogChatResponse({
      cacheKey: 'intermittent',
      locale: 'ko',
      responseData: RESPONSE,
    })
    vi.setSystemTime(100 + BLOG_CHAT.CACHE.TTL_MILLISECONDS)
    await cleanupExpiredBlogChatResponseCache({
      ttlMilliseconds: BLOG_CHAT.CACHE.TTL_MILLISECONDS,
    })
    sharedCacheStoreMock.selectSharedChatResponse.mockRejectedValueOnce(
      new Error('unavailable'),
    )
    await expect(getCachedBlogChatResponse('intermittent')).resolves.toBeNull()
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

  it('공유 저장소 조회가 실패해도 캐시 미스로 처리한다', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    sharedCacheStoreMock.isSharedChatResponseCacheConfigured.mockReturnValue(
      true,
    )
    sharedCacheStoreMock.selectSharedChatResponse.mockRejectedValueOnce(
      new Error('relation "chat_response_cache" does not exist'),
    )

    await expect(
      getCachedBlogChatResponse('ko:global:question'),
    ).resolves.toBeNull()

    consoleErrorSpy.mockRestore()
  })

  it('공유 저장소 저장이 실패해도 같은 인스턴스의 메모리 캐시에는 남긴다', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    sharedCacheStoreMock.isSharedChatResponseCacheConfigured.mockReturnValue(
      true,
    )
    sharedCacheStoreMock.saveSharedExactChatResponse.mockRejectedValueOnce(
      new Error('relation "chat_response_cache" does not exist'),
    )

    await setCachedBlogChatResponse({
      cacheKey: 'memory-fallback',
      locale: 'ko',
      responseData: RESPONSE,
      now: 100,
    })

    sharedCacheStoreMock.isSharedChatResponseCacheConfigured.mockReturnValue(
      false,
    )

    await expect(getCachedBlogChatResponse('memory-fallback')).resolves.toEqual(
      RESPONSE,
    )

    consoleErrorSpy.mockRestore()
  })
})
