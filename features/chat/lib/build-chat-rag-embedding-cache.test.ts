import { describe, expect, it } from 'vitest'
import {
  buildChatRagEmbeddingCacheKey,
  buildReusableChatRagEmbeddingMap,
} from '@/features/chat/lib/build-chat-rag-embedding-cache'
import type { ChatRagEmbeddingTextSource } from '@/features/chat/lib/build-chat-rag-embedding-text'

const EMBEDDING_SOURCE: ChatRagEmbeddingTextSource = {
  title: 'nivo chart로 데이터 시각화하기',
  sectionTitle: '차트 종류',
  content: '라인 차트와 바 차트를 비교한다.',
  tags: ['nivo'],
  searchTerms: ['nivo', '차트'],
}

const EMBEDDING_PROVIDER = 'modal'
const EMBEDDING_MODEL_ID = 'sentence-transformers/test-model'

describe('buildChatRagEmbeddingCacheKey', () => {
  it('같은 provider, 모델, 입력이면 같은 키를 만든다', () => {
    expect(
      buildChatRagEmbeddingCacheKey({
        embeddingProvider: EMBEDDING_PROVIDER,
        embeddingModelId: EMBEDDING_MODEL_ID,
        source: EMBEDDING_SOURCE,
      }),
    ).toBe(
      buildChatRagEmbeddingCacheKey({
        embeddingProvider: EMBEDDING_PROVIDER,
        embeddingModelId: EMBEDDING_MODEL_ID,
        source: { ...EMBEDDING_SOURCE },
      }),
    )
  })

  it('본문이 바뀌면 다른 키를 만든다', () => {
    expect(
      buildChatRagEmbeddingCacheKey({
        embeddingProvider: EMBEDDING_PROVIDER,
        embeddingModelId: EMBEDDING_MODEL_ID,
        source: { ...EMBEDDING_SOURCE, content: '본문이 수정되었습니다.' },
      }),
    ).not.toBe(
      buildChatRagEmbeddingCacheKey({
        embeddingProvider: EMBEDDING_PROVIDER,
        embeddingModelId: EMBEDDING_MODEL_ID,
        source: EMBEDDING_SOURCE,
      }),
    )
  })

  it('provider나 모델이 바뀌면 다른 키를 만든다', () => {
    const cacheKey = buildChatRagEmbeddingCacheKey({
      embeddingProvider: EMBEDDING_PROVIDER,
      embeddingModelId: EMBEDDING_MODEL_ID,
      source: EMBEDDING_SOURCE,
    })

    expect(
      buildChatRagEmbeddingCacheKey({
        embeddingProvider: 'openai',
        embeddingModelId: EMBEDDING_MODEL_ID,
        source: EMBEDDING_SOURCE,
      }),
    ).not.toBe(cacheKey)
    expect(
      buildChatRagEmbeddingCacheKey({
        embeddingProvider: EMBEDDING_PROVIDER,
        embeddingModelId: 'sentence-transformers/other-model',
        source: EMBEDDING_SOURCE,
      }),
    ).not.toBe(cacheKey)
  })
})

describe('buildReusableChatRagEmbeddingMap', () => {
  it('이전 색인 벡터를 입력 지문으로 찾을 수 있게 만든다', () => {
    const storedEmbedding = [0.1, 0.2, 0.3]
    const reusableEmbeddingMap = buildReusableChatRagEmbeddingMap({
      embeddingProvider: EMBEDDING_PROVIDER,
      embeddingModelId: EMBEDDING_MODEL_ID,
      storedEmbeddings: [
        { source: EMBEDDING_SOURCE, embedding: storedEmbedding },
      ],
    })
    const cacheKey = buildChatRagEmbeddingCacheKey({
      embeddingProvider: EMBEDDING_PROVIDER,
      embeddingModelId: EMBEDDING_MODEL_ID,
      source: EMBEDDING_SOURCE,
    })

    expect(reusableEmbeddingMap.get(cacheKey)).toEqual(storedEmbedding)
  })

  it('입력이 바뀐 chunk는 재사용 대상에서 빠진다', () => {
    const reusableEmbeddingMap = buildReusableChatRagEmbeddingMap({
      embeddingProvider: EMBEDDING_PROVIDER,
      embeddingModelId: EMBEDDING_MODEL_ID,
      storedEmbeddings: [
        { source: EMBEDDING_SOURCE, embedding: [0.1, 0.2, 0.3] },
      ],
    })
    const changedCacheKey = buildChatRagEmbeddingCacheKey({
      embeddingProvider: EMBEDDING_PROVIDER,
      embeddingModelId: EMBEDDING_MODEL_ID,
      source: { ...EMBEDDING_SOURCE, title: '새 제목' },
    })

    expect(reusableEmbeddingMap.get(changedCacheKey)).toBeUndefined()
  })
})
