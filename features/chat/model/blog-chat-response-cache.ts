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

const BLOG_CHAT_RESPONSE_CACHE_LOG = {
  READ_FAILURE_MESSAGE: 'Failed to read the shared chat response cache.',
  WRITE_FAILURE_MESSAGE: 'Failed to write the shared chat response cache.',
  CLEANUP_FAILURE_MESSAGE: 'Failed to delete expired shared chat responses.',
} as const

/**
 * 캐시는 답변을 돕는 장치일 뿐이므로, 공유 저장소 장애가 답변 실패로 이어지면 안 된다.
 * 조회는 undefined(공유 저장소 사용 불가)를 돌려주고 호출부가 메모리 캐시로 이어서 처리한다.
 */
async function findSharedCachedBlogChatResponse(
  cacheKey: string,
): Promise<BlogChatResponse | null | undefined> {
  try {
    return await selectSharedChatResponse({ cacheKey })
  } catch (error) {
    console.error(BLOG_CHAT_RESPONSE_CACHE_LOG.READ_FAILURE_MESSAGE, error)

    return undefined
  }
}

/**
 * 응답 캐시 키로 캐시된 응답을 찾는다.
 *
 * Postgres가 설정되어 있으면 인스턴스 간에 공유되는 저장소를 쓰고, 아니면 프로세스 메모리를 쓴다.
 */
export async function getCachedBlogChatResponse(
  cacheKey: string,
): Promise<BlogChatResponse | null> {
  if (isSharedChatResponseCacheConfigured()) {
    const sharedResponse = await findSharedCachedBlogChatResponse(cacheKey)

    if (sharedResponse !== undefined) {
      return sharedResponse
    }
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
    try {
      await saveSharedExactChatResponse({
        cacheKey: params.cacheKey,
        locale: params.locale,
        response: params.responseData,
        ttlMilliseconds: BLOG_CHAT.CACHE.TTL_MILLISECONDS,
        now: params.now,
      })

      return
    } catch (error) {
      console.error(BLOG_CHAT_RESPONSE_CACHE_LOG.WRITE_FAILURE_MESSAGE, error)
    }
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
    try {
      await deleteExpiredSharedChatResponses({ now: params.now })

      return
    } catch (error) {
      console.error(BLOG_CHAT_RESPONSE_CACHE_LOG.CLEANUP_FAILURE_MESSAGE, error)
    }
  }

  const now = params.now ?? Date.now()

  for (const [cacheKey, cacheEntry] of blogChatResponseCache.entries()) {
    if (now - cacheEntry.createdAt > params.ttlMilliseconds) {
      blogChatResponseCache.delete(cacheKey)
    }
  }
}
