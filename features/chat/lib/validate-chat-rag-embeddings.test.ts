import { describe, expect, it } from 'vitest'
import { validateChatRagEmbeddingBatch } from '@/features/chat/lib/validate-chat-rag-embeddings'

describe('validateChatRagEmbeddingBatch', () => {
  it('동일한 개수와 차원의 유한한 embedding을 허용한다', () => {
    expect(
      validateChatRagEmbeddingBatch({
        embeddings: [
          [0.1, 0.2],
          [0.3, 0.4],
        ],
        expectedEmbeddingCount: 2,
      }),
    ).toBe(2)
  })

  it('입력 개수와 embedding 개수가 다르면 실패한다', () => {
    expect(() => {
      validateChatRagEmbeddingBatch({
        embeddings: [[0.1, 0.2]],
        expectedEmbeddingCount: 2,
      })
    }).toThrow('for 2 input(s)')
  })

  it('batch 사이에 embedding 차원이 달라지면 실패한다', () => {
    expect(() => {
      validateChatRagEmbeddingBatch({
        embeddings: [[0.1, 0.2, 0.3]],
        expectedEmbeddingCount: 1,
        expectedEmbeddingDimension: 2,
      })
    }).toThrow('dimension changed')
  })
})
