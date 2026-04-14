import { BLOG_CHAT } from '@/features/chat/config/constants'
import { embedChatRagQuestion } from '@/features/chat/model/chat-rag-embedding-provider'
import type { BlogChatResponse } from '@/features/chat/model/chat-schema'
import type { SupportedLocale } from '@/shared/config/constants'

interface SemanticCacheEntry {
  createdAt: number
  locale: SupportedLocale
  currentPostSlug?: string
  questionEmbedding: number[]
  response: BlogChatResponse
}

interface FindSemanticCachedBlogChatResponseParams {
  locale: SupportedLocale
  question: string
  currentPostSlug?: string
}

interface StoreSemanticCachedBlogChatResponseParams
  extends FindSemanticCachedBlogChatResponseParams {
  response: BlogChatResponse
}

const semanticCacheEntries: SemanticCacheEntry[] = []

function calcDotProduct(leftVector: number[], rightVector: number[]): number {
  return leftVector.reduce((sum, leftValue, index) => {
    return sum + leftValue * (rightVector[index] ?? 0)
  }, 0)
}

function calcVectorMagnitude(vector: number[]): number {
  return Math.sqrt(
    vector.reduce((sum, value) => {
      return sum + value * value
    }, 0),
  )
}

function calcCosineSimilarity(leftVector: number[], rightVector: number[]): number {
  const denominator =
    calcVectorMagnitude(leftVector) * calcVectorMagnitude(rightVector)

  if (denominator === 0) {
    return 0
  }

  return calcDotProduct(leftVector, rightVector) / denominator
}

function cleanupExpiredSemanticCacheEntries(): void {
  const now = Date.now()

  for (let index = semanticCacheEntries.length - 1; index >= 0; index -= 1) {
    const cacheEntry = semanticCacheEntries[index]

    if (
      now - cacheEntry.createdAt >
      BLOG_CHAT.SEMANTIC_CACHE.TTL_MILLISECONDS
    ) {
      semanticCacheEntries.splice(index, 1)
    }
  }
}

export async function findSemanticCachedBlogChatResponse({
  locale,
  question,
  currentPostSlug,
}: FindSemanticCachedBlogChatResponseParams): Promise<
  BlogChatResponse | undefined
> {
  cleanupExpiredSemanticCacheEntries()

  if (semanticCacheEntries.length === 0) {
    return undefined
  }

  const questionEmbedding = await embedChatRagQuestion(question)

  for (const cacheEntry of semanticCacheEntries) {
    if (cacheEntry.locale !== locale) {
      continue
    }

    if ((cacheEntry.currentPostSlug ?? null) !== (currentPostSlug ?? null)) {
      continue
    }

    if (
      calcCosineSimilarity(questionEmbedding, cacheEntry.questionEmbedding) >=
      BLOG_CHAT.SEMANTIC_CACHE.MINIMUM_SIMILARITY_SCORE
    ) {
      return cacheEntry.response
    }
  }

  return undefined
}

export async function storeSemanticCachedBlogChatResponse({
  locale,
  question,
  currentPostSlug,
  response,
}: StoreSemanticCachedBlogChatResponseParams): Promise<void> {
  cleanupExpiredSemanticCacheEntries()

  if (!response.grounded) {
    return
  }

  const questionEmbedding = await embedChatRagQuestion(question)

  semanticCacheEntries.push({
    createdAt: Date.now(),
    locale,
    currentPostSlug,
    questionEmbedding,
    response,
  })

  if (
    semanticCacheEntries.length > BLOG_CHAT.SEMANTIC_CACHE.MAXIMUM_ENTRY_COUNT
  ) {
    semanticCacheEntries.shift()
  }
}
