import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BlogChatResponse } from '@/features/chat/model/chat-schema'
import {
  cleanupExpiredBlogChatResponseCache,
  getCachedBlogChatResponse,
  setCachedBlogChatResponse,
} from '@/features/chat/model/blog-chat-response-cache'

const RESPONSE: BlogChatResponse = {
  answer: 'cached answer',
  citations: [],
  grounded: false,
}

describe('blog chat response cache', () => {
  beforeEach(() => {
    cleanupExpiredBlogChatResponseCache({
      now: Number.POSITIVE_INFINITY,
      ttlMilliseconds: 0,
    })
  })

  it('캐시된 응답을 키로 다시 조회한다', () => {
    setCachedBlogChatResponse({
      cacheKey: 'ko:global:question',
      responseData: RESPONSE,
      now: 100,
    })

    expect(getCachedBlogChatResponse('ko:global:question')).toEqual(RESPONSE)
  })

  it('TTL을 지난 응답을 정리한다', () => {
    setCachedBlogChatResponse({
      cacheKey: 'expired',
      responseData: RESPONSE,
      now: 100,
    })

    cleanupExpiredBlogChatResponseCache({
      now: 1001,
      ttlMilliseconds: 900,
    })

    expect(getCachedBlogChatResponse('expired')).toBeNull()
  })

  it('TTL 이내 응답은 유지한다', () => {
    setCachedBlogChatResponse({
      cacheKey: 'fresh',
      responseData: RESPONSE,
      now: 100,
    })

    cleanupExpiredBlogChatResponseCache({
      now: 999,
      ttlMilliseconds: 900,
    })

    expect(getCachedBlogChatResponse('fresh')).toEqual(RESPONSE)
  })
})
