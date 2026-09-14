import { BLOG_CHAT } from '@/features/chat/config/constants'
import {
  deleteExpiredSharedChatResponses,
  isSharedChatResponseCacheConfigured,
  saveSharedExactChatResponse,
  selectSharedChatResponse,
} from '@/features/chat/model/chat-response-cache-store'
import type { BlogChatResponse } from '@/features/chat/model/chat-schema'
import type { SupportedLocale } from '@/shared/config/constants'

interface CachedBlogChatResponse {
  createdAt: number
  data: BlogChatResponse
}

const blogChatResponseCache = new Map<string, CachedBlogChatResponse>()

/**
 * 응답 캐시 키로 캐시된 응답을 찾는다.
 *
 * Postgres가 설정되어 있으면 인스턴스 간에 공유되는 저장소를 쓰고, 아니면 프로세스 메모리를 쓴다.
 */
export async function getCachedBlogChatResponse(
  cacheKey: string,
): Promise<BlogChatResponse | null> {
  if (isSharedChatResponseCacheConfigured()) {
    return selectSharedChatResponse({ cacheKey })
  }

  return blogChatResponseCache.get(cacheKey)?.data ?? null
}

export async function setCachedBlogChatResponse(params: {
  cacheKey: string
  locale: SupportedLocale
  responseData: BlogChatResponse
  now?: number
}): Promise<void> {
  if (isSharedChatResponseCacheConfigured()) {
    await saveSharedExactChatResponse({
      cacheKey: params.cacheKey,
      locale: params.locale,
      response: params.responseData,
      ttlMilliseconds: BLOG_CHAT.CACHE.TTL_MILLISECONDS,
      now: params.now,
    })

    return
  }

  blogChatResponseCache.set(params.cacheKey, {
    createdAt: params.now ?? Date.now(),
    data: params.responseData,
  })
}

export async function cleanupExpiredBlogChatResponseCache(params: {
  now?: number
  ttlMilliseconds: number
}): Promise<void> {
  if (isSharedChatResponseCacheConfigured()) {
    await deleteExpiredSharedChatResponses({ now: params.now })

    return
  }

  const now = params.now ?? Date.now()

  for (const [cacheKey, cacheEntry] of blogChatResponseCache.entries()) {
    if (now - cacheEntry.createdAt > params.ttlMilliseconds) {
      blogChatResponseCache.delete(cacheKey)
    }
  }
}
