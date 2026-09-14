import { createHash } from 'node:crypto'
import {
  buildChatRagEmbeddingText,
  type ChatRagEmbeddingTextSource,
} from '@/features/chat/lib/build-chat-rag-embedding-text'

const CHAT_RAG_EMBEDDING_CACHE = {
  DIGEST_ALGORITHM: 'sha256',
  DIGEST_ENCODING: 'hex',
  FIELD_SEPARATOR: '\n',
} as const

interface BuildChatRagEmbeddingCacheKeyParams {
  embeddingProvider: string
  embeddingModelId: string
  source: ChatRagEmbeddingTextSource
}

interface BuildReusableChatRagEmbeddingMapParams {
  embeddingProvider: string
  embeddingModelId: string
  storedEmbeddings: Array<{
    source: ChatRagEmbeddingTextSource
    embedding: number[]
  }>
}

/**
 * 임베딩 재사용 키를 만든다.
 *
 * provider, 모델, 임베딩 입력 텍스트가 모두 같으면 같은 벡터가 나오므로, 이 셋을 묶어
 * 지문을 만들고 이전 색인의 벡터를 그대로 재사용한다. 입력이 한 글자라도 바뀌면 다른 키가 된다.
 */
export function buildChatRagEmbeddingCacheKey({
  embeddingProvider,
  embeddingModelId,
  source,
}: BuildChatRagEmbeddingCacheKeyParams): string {
  return createHash(CHAT_RAG_EMBEDDING_CACHE.DIGEST_ALGORITHM)
    .update(
      [
        embeddingProvider,
        embeddingModelId,
        buildChatRagEmbeddingText(source),
      ].join(CHAT_RAG_EMBEDDING_CACHE.FIELD_SEPARATOR),
    )
    .digest(CHAT_RAG_EMBEDDING_CACHE.DIGEST_ENCODING)
}

export function buildReusableChatRagEmbeddingMap({
  embeddingProvider,
  embeddingModelId,
  storedEmbeddings,
}: BuildReusableChatRagEmbeddingMapParams): Map<string, number[]> {
  const reusableEmbeddingMap = new Map<string, number[]>()

  for (const storedEmbedding of storedEmbeddings) {
    reusableEmbeddingMap.set(
      buildChatRagEmbeddingCacheKey({
        embeddingProvider,
        embeddingModelId,
        source: storedEmbedding.source,
      }),
      storedEmbedding.embedding,
    )
  }

  return reusableEmbeddingMap
}
