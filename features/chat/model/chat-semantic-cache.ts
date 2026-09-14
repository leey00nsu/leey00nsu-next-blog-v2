import { BLOG_CHAT } from '@/features/chat/config/constants'
import { embedChatRagQuestion } from '@/features/chat/model/chat-rag-embedding-provider'
import {
  isSharedChatResponseCacheConfigured,
  saveSharedSemanticChatResponse,
  selectSharedSemanticChatResponse,
} from '@/features/chat/model/chat-response-cache-store'
import type { BlogChatResponse } from '@/features/chat/model/chat-schema'
import type { SupportedLocale } from '@/shared/config/constants'

interface SemanticCacheEntry {
  createdAt: number
  locale: SupportedLocale
  currentPostSlug?: string
  intentCacheKey?: string
  questionEmbedding: number[]
  response: BlogChatResponse
}

interface FindSemanticCachedBlogChatResponseParams {
  locale: SupportedLocale
  question: string
  currentPostSlug?: string
  intentCacheKey?: string
  resolveQuestionEmbedding?: () => Promise<number[]>
}

interface StoreSemanticCachedBlogChatResponseParams
  extends FindSemanticCachedBlogChatResponseParams {
  response: BlogChatResponse
}

const semanticCacheEntries: SemanticCacheEntry[] = []

const CHAT_SEMANTIC_CACHE_LOG = {
  READ_FAILURE_MESSAGE:
    'Failed to read the shared semantic chat response cache.',
  WRITE_FAILURE_MESSAGE:
    'Failed to write the shared semantic chat response cache.',
} as const

async function resolveQuestionEmbeddingSafely(params: {
  question: string
  resolveQuestionEmbedding?: () => Promise<number[]>
}): Promise<number[] | null> {
  try {
    return params.resolveQuestionEmbedding
      ? await params.resolveQuestionEmbedding()
      : await embedChatRagQuestion(params.question)
  } catch {
    return null
  }
}

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

function calcCosineSimilarity(
  leftVector: number[],
  rightVector: number[],
): number {
  if (leftVector.length !== rightVector.length) {
    return 0
  }

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
  intentCacheKey,
  resolveQuestionEmbedding,
}: FindSemanticCachedBlogChatResponseParams): Promise<
  BlogChatResponse | undefined
> {
  if (isSharedChatResponseCacheConfigured()) {
    const questionEmbedding = await resolveQuestionEmbeddingSafely({
      question,
      resolveQuestionEmbedding,
    })

    if (!questionEmbedding) {
      return undefined
    }

    try {
      const sharedResponse = await selectSharedSemanticChatResponse({
        locale,
        questionEmbedding,
        currentPostSlug,
        intentCacheKey,
        minimumSimilarityScore:
          BLOG_CHAT.SEMANTIC_CACHE.MINIMUM_SIMILARITY_SCORE,
      })

      return sharedResponse ?? undefined
    } catch (error) {
      console.error(CHAT_SEMANTIC_CACHE_LOG.READ_FAILURE_MESSAGE, error)
    }
  }

  cleanupExpiredSemanticCacheEntries()

  if (semanticCacheEntries.length === 0) {
    return undefined
  }

  const questionEmbedding = await resolveQuestionEmbeddingSafely({
    question,
    resolveQuestionEmbedding,
  })

  if (!questionEmbedding) {
    return undefined
  }

  for (const cacheEntry of semanticCacheEntries) {
    if (cacheEntry.locale !== locale) {
      continue
    }

    if ((cacheEntry.currentPostSlug ?? null) !== (currentPostSlug ?? null)) {
      continue
    }

    if ((cacheEntry.intentCacheKey ?? null) !== (intentCacheKey ?? null)) {
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
  intentCacheKey,
  response,
  resolveQuestionEmbedding,
}: StoreSemanticCachedBlogChatResponseParams): Promise<void> {
  if (!response.grounded) {
    return
  }

  const questionEmbedding = await resolveQuestionEmbeddingSafely({
    question,
    resolveQuestionEmbedding,
  })

  if (!questionEmbedding) {
    return
  }

  if (isSharedChatResponseCacheConfigured()) {
    try {
      await saveSharedSemanticChatResponse({
        locale,
        question,
        currentPostSlug,
        intentCacheKey,
        questionEmbedding,
        response,
        ttlMilliseconds: BLOG_CHAT.SEMANTIC_CACHE.TTL_MILLISECONDS,
      })

      return
    } catch (error) {
      console.error(CHAT_SEMANTIC_CACHE_LOG.WRITE_FAILURE_MESSAGE, error)
    }
  }

  cleanupExpiredSemanticCacheEntries()

  semanticCacheEntries.push({
    createdAt: Date.now(),
    locale,
    currentPostSlug,
    intentCacheKey,
    questionEmbedding,
    response,
  })

  if (
    semanticCacheEntries.length > BLOG_CHAT.SEMANTIC_CACHE.MAXIMUM_ENTRY_COUNT
  ) {
    semanticCacheEntries.shift()
  }
}
