import { describe, expect, it } from 'vitest'
import { shouldCacheBlogChatResponse } from './blog-chat-cache'
import type { BlogChatResponse } from '@/features/chat/model/chat-schema'

function buildResponse(
  response: Partial<BlogChatResponse>,
): BlogChatResponse {
  return {
    answer: '',
    citations: [],
    grounded: false,
    ...response,
  }
}

describe('shouldCacheBlogChatResponse', () => {
  it('grounded 응답은 캐시한다', () => {
    expect(
      shouldCacheBlogChatResponse(
        buildResponse({
          answer: '답변',
          grounded: true,
        }),
      ),
    ).toBe(true)
  })

  it('검색 부족/근거 부족 거절도 캐시한다', () => {
    expect(
      shouldCacheBlogChatResponse(
        buildResponse({
          refusalReason: 'insufficient_search_match',
        }),
      ),
    ).toBe(true)

    expect(
      shouldCacheBlogChatResponse(
        buildResponse({
          refusalReason: 'insufficient_evidence',
        }),
      ),
    ).toBe(true)
  })

  it('일일 제한, 모델 오류 같은 응답은 캐시하지 않는다', () => {
    expect(
      shouldCacheBlogChatResponse(
        buildResponse({
          refusalReason: 'daily_limit_exceeded',
        }),
      ),
    ).toBe(false)

    expect(
      shouldCacheBlogChatResponse(
        buildResponse({
          refusalReason: 'model_error',
        }),
      ),
    ).toBe(false)

    expect(
      shouldCacheBlogChatResponse(
        buildResponse({
          refusalReason: 'rate_limited',
        }),
      ),
    ).toBe(false)
  })
})
