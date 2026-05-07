import type { BlogChatResponse } from '@/features/chat/model/chat-schema'

interface CachedBlogChatResponse {
  createdAt: number
  data: BlogChatResponse
}

const blogChatResponseCache = new Map<string, CachedBlogChatResponse>()

export function getCachedBlogChatResponse(
  cacheKey: string,
): BlogChatResponse | null {
  return blogChatResponseCache.get(cacheKey)?.data ?? null
}

export function setCachedBlogChatResponse(params: {
  cacheKey: string
  responseData: BlogChatResponse
  now?: number
}): void {
  blogChatResponseCache.set(params.cacheKey, {
    createdAt: params.now ?? Date.now(),
    data: params.responseData,
  })
}

export function cleanupExpiredBlogChatResponseCache(params: {
  now?: number
  ttlMilliseconds: number
}): void {
  const now = params.now ?? Date.now()

  for (const [cacheKey, cacheEntry] of blogChatResponseCache.entries()) {
    if (now - cacheEntry.createdAt > params.ttlMilliseconds) {
      blogChatResponseCache.delete(cacheKey)
    }
  }
}
