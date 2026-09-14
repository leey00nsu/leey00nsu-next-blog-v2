import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BlogChatResponse } from '@/features/chat/model/chat-schema'
import {
  deleteExpiredSharedChatResponses,
  isSharedChatResponseCacheConfigured,
  saveSharedExactChatResponse,
  saveSharedSemanticChatResponse,
  selectSharedChatResponse,
  selectSharedSemanticChatResponse,
} from '@/features/chat/model/chat-response-cache-store'

const { queryMock } = vi.hoisted(() => {
  return {
    queryMock: vi.fn(),
  }
})

vi.mock('@/features/chat/model/chat-rag-database', () => {
  return {
    getChatRagDatabasePool: async () => {
      return { query: queryMock }
    },
    isChatRagDatabaseConfigured: () => true,
  }
})

const CACHED_RESPONSE: BlogChatResponse = {
  answer: '캐시된 답변',
  citations: [],
  grounded: true,
}

const TTL_MILLISECONDS = 300_000

describe('selectSharedChatResponse', () => {
  beforeEach(() => {
    queryMock.mockReset()
  })

  it('저장된 응답을 검증해 돌려준다', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ response_json: CACHED_RESPONSE }],
    })

    await expect(
      selectSharedChatResponse({ cacheKey: 'ko:global:question', now: 1000 }),
    ).resolves.toEqual(CACHED_RESPONSE)
    expect(queryMock.mock.calls[0]?.[1]).toEqual([
      'exact',
      'ko:global:question',
      new Date(1000),
    ])
  })

  it('저장된 응답이 schema에 맞지 않으면 캐시 미스로 처리한다', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ response_json: '{"answer":"","citations":[]}' }],
    })

    await expect(
      selectSharedChatResponse({ cacheKey: 'ko:global:broken' }),
    ).resolves.toBeNull()
  })

  it('만료된 응답만 있으면 캐시 미스로 처리한다', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] })

    await expect(
      selectSharedChatResponse({ cacheKey: 'ko:global:expired' }),
    ).resolves.toBeNull()
  })
})

describe('selectSharedSemanticChatResponse', () => {
  beforeEach(() => {
    queryMock.mockReset()
  })

  it('가장 유사한 응답이 임계값 이상이면 재사용한다', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ response_json: CACHED_RESPONSE, similarity: 0.95 }],
    })

    await expect(
      selectSharedSemanticChatResponse({
        locale: 'ko',
        intentCacheKey: 'intent',
        questionEmbedding: [1, 0],
        minimumSimilarityScore: 0.92,
      }),
    ).resolves.toEqual(CACHED_RESPONSE)
    expect(queryMock.mock.calls[0]?.[1]).toEqual([
      'semantic',
      'ko',
      expect.any(Date),
      null,
      '[1,0]',
      'intent',
    ])
  })

  it('가장 유사한 응답도 임계값 미만이면 재사용하지 않는다', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ response_json: CACHED_RESPONSE, similarity: 0.5 }],
    })

    await expect(
      selectSharedSemanticChatResponse({
        locale: 'ko',
        questionEmbedding: [1, 0],
        minimumSimilarityScore: 0.92,
      }),
    ).resolves.toBeNull()
  })
})

describe('saveSharedExactChatResponse', () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryMock.mockResolvedValue({ rows: [] })
  })

  it('만료 시각을 TTL로 계산해 저장한다', async () => {
    await saveSharedExactChatResponse({
      cacheKey: 'ko:global:question',
      locale: 'ko',
      response: CACHED_RESPONSE,
      ttlMilliseconds: TTL_MILLISECONDS,
      now: 1000,
    })

    const insertValues = queryMock.mock.calls[0]?.[1]

    expect(insertValues?.[1]).toBe('exact')
    expect(insertValues?.[6]).toBe(JSON.stringify(CACHED_RESPONSE))
    expect(insertValues?.[7]).toEqual(new Date(1000))
    expect(insertValues?.[8]).toEqual(new Date(1000 + TTL_MILLISECONDS))
  })
})

describe('saveSharedSemanticChatResponse', () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryMock.mockResolvedValue({ rows: [] })
  })

  it('질문 지문으로 만든 키와 질문 embedding을 함께 저장한다', async () => {
    await saveSharedSemanticChatResponse({
      locale: 'ko',
      question: 'nivo를 쓴 적 있나요?',
      intentCacheKey: 'intent',
      questionEmbedding: [1, 0, 0],
      response: CACHED_RESPONSE,
      ttlMilliseconds: TTL_MILLISECONDS,
    })

    const insertValues = queryMock.mock.calls[0]?.[1]

    expect(String(insertValues?.[0])).toMatch(/^semantic:/)
    expect(insertValues?.[1]).toBe('semantic')
    expect(insertValues?.[4]).toBe('intent')
    expect(insertValues?.[5]).toBe('[1,0,0]')
  })

  it('같은 질문은 같은 키로 저장해 중복 행을 만들지 않는다', async () => {
    const storeParams = {
      locale: 'ko' as const,
      question: '같은 질문',
      questionEmbedding: [1, 0],
      response: CACHED_RESPONSE,
      ttlMilliseconds: TTL_MILLISECONDS,
    }

    await saveSharedSemanticChatResponse(storeParams)
    await saveSharedSemanticChatResponse(storeParams)

    expect(queryMock.mock.calls[0]?.[1]?.[0]).toBe(
      queryMock.mock.calls[1]?.[1]?.[0],
    )
  })
})

describe('deleteExpiredSharedChatResponses', () => {
  beforeEach(() => {
    queryMock.mockReset()
    queryMock.mockResolvedValue({ rows: [] })
  })

  it('만료 시각이 지난 행만 지운다', async () => {
    await deleteExpiredSharedChatResponses({ now: 2000 })

    expect(queryMock.mock.calls[0]?.[0]).toContain('DELETE FROM')
    expect(queryMock.mock.calls[0]?.[1]).toEqual([new Date(2000)])
  })
})

describe('isSharedChatResponseCacheConfigured', () => {
  it('공유 저장소를 쓸 수 있으면 true를 돌려준다', () => {
    expect(isSharedChatResponseCacheConfigured()).toBe(true)
  })
})
