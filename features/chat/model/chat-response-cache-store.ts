import { createHash } from 'node:crypto'
import type { Pool, PoolClient } from 'pg'
import { buildPgvectorLiteral } from '@/features/chat/lib/pgvector'
import {
  getChatRagDatabasePool,
  isChatRagDatabaseConfigured,
} from '@/features/chat/model/chat-rag-database'
import {
  BlogChatResponseSchema,
  type BlogChatResponse,
} from '@/features/chat/model/chat-schema'
import type { SupportedLocale } from '@/shared/config/constants'

const CHAT_RESPONSE_CACHE_STORE = {
  TABLE: 'chat_response_cache',
  KINDS: {
    EXACT: 'exact',
    SEMANTIC: 'semantic',
  },
  SEMANTIC_CACHE_KEY_PREFIX: 'semantic',
  CACHE_KEY_SEPARATOR: '|',
  DIGEST_ALGORITHM: 'sha256',
  DIGEST_ENCODING: 'hex',
} as const

interface SaveSharedChatResponseParams {
  cacheKey: string
  cacheKind: (typeof CHAT_RESPONSE_CACHE_STORE.KINDS)[keyof typeof CHAT_RESPONSE_CACHE_STORE.KINDS]
  locale: SupportedLocale
  currentPostSlug?: string
  intentCacheKey?: string
  questionEmbedding?: number[]
  response: BlogChatResponse
  ttlMilliseconds: number
  now?: number
}

function resolveCacheTimestamp(params: { now?: number }): Date {
  return new Date(params.now ?? Date.now())
}

function parseCachedResponse(responseJson: unknown): BlogChatResponse | null {
  const parsedJson =
    typeof responseJson === 'string' ? JSON.parse(responseJson) : responseJson
  const parsedResponse = BlogChatResponseSchema.safeParse(parsedJson)

  return parsedResponse.success ? parsedResponse.data : null
}

function buildSemanticCacheKey(params: {
  locale: SupportedLocale
  currentPostSlug?: string
  intentCacheKey?: string
  question: string
}): string {
  const cacheKeyDigest = createHash(CHAT_RESPONSE_CACHE_STORE.DIGEST_ALGORITHM)
    .update(
      [
        params.locale,
        params.currentPostSlug ?? '',
        params.intentCacheKey ?? '',
        params.question,
      ].join(CHAT_RESPONSE_CACHE_STORE.CACHE_KEY_SEPARATOR),
    )
    .digest(CHAT_RESPONSE_CACHE_STORE.DIGEST_ENCODING)

  return `${CHAT_RESPONSE_CACHE_STORE.SEMANTIC_CACHE_KEY_PREFIX}:${cacheKeyDigest}`
}

async function saveSharedChatResponse(
  params: SaveSharedChatResponseParams,
): Promise<void> {
  const databasePool: Pool | PoolClient = await getChatRagDatabasePool()
  const now = resolveCacheTimestamp({ now: params.now })

  await databasePool.query(
    [
      `INSERT INTO ${CHAT_RESPONSE_CACHE_STORE.TABLE} (`,
      '  cache_key,',
      '  cache_kind,',
      '  locale,',
      '  current_post_slug,',
      '  intent_cache_key,',
      '  question_embedding,',
      '  response_json,',
      '  created_at,',
      '  expires_at',
      ') VALUES ($1, $2, $3, $4, $5, $6::vector, $7::jsonb, $8, $9)',
      'ON CONFLICT (cache_key)',
      'DO UPDATE SET',
      '  cache_kind = EXCLUDED.cache_kind,',
      '  locale = EXCLUDED.locale,',
      '  current_post_slug = EXCLUDED.current_post_slug,',
      '  intent_cache_key = EXCLUDED.intent_cache_key,',
      '  question_embedding = EXCLUDED.question_embedding,',
      '  response_json = EXCLUDED.response_json,',
      '  created_at = EXCLUDED.created_at,',
      '  expires_at = EXCLUDED.expires_at',
    ].join('\n'),
    [
      params.cacheKey,
      params.cacheKind,
      params.locale,
      params.currentPostSlug ?? null,
      params.intentCacheKey ?? null,
      params.questionEmbedding
        ? buildPgvectorLiteral(params.questionEmbedding)
        : null,
      JSON.stringify(params.response),
      now,
      new Date(now.getTime() + params.ttlMilliseconds),
    ],
  )
}

export function isSharedChatResponseCacheConfigured(): boolean {
  return isChatRagDatabaseConfigured()
}

export async function selectSharedChatResponse(params: {
  cacheKey: string
  now?: number
}): Promise<BlogChatResponse | null> {
  const databasePool: Pool | PoolClient = await getChatRagDatabasePool()
  const responseResult = await databasePool.query(
    [
      'SELECT response_json',
      `FROM ${CHAT_RESPONSE_CACHE_STORE.TABLE}`,
      'WHERE cache_kind = $1',
      '  AND cache_key = $2',
      '  AND expires_at > $3',
    ].join('\n'),
    [
      CHAT_RESPONSE_CACHE_STORE.KINDS.EXACT,
      params.cacheKey,
      resolveCacheTimestamp({ now: params.now }),
    ],
  )
  const cachedResponseRow = responseResult.rows[0]

  return cachedResponseRow
    ? parseCachedResponse(cachedResponseRow.response_json)
    : null
}

export async function saveSharedExactChatResponse(params: {
  cacheKey: string
  locale: SupportedLocale
  response: BlogChatResponse
  ttlMilliseconds: number
  now?: number
}): Promise<void> {
  await saveSharedChatResponse({
    cacheKey: params.cacheKey,
    cacheKind: CHAT_RESPONSE_CACHE_STORE.KINDS.EXACT,
    locale: params.locale,
    response: params.response,
    ttlMilliseconds: params.ttlMilliseconds,
    now: params.now,
  })
}

export async function selectSharedSemanticChatResponse(params: {
  locale: SupportedLocale
  currentPostSlug?: string
  intentCacheKey?: string
  questionEmbedding: number[]
  minimumSimilarityScore: number
  now?: number
}): Promise<BlogChatResponse | null> {
  const databasePool: Pool | PoolClient = await getChatRagDatabasePool()
  const responseResult = await databasePool.query(
    [
      'SELECT',
      '  response_json,',
      '  GREATEST(0, 1 - (question_embedding <=> $5::vector))::float8 AS similarity',
      `FROM ${CHAT_RESPONSE_CACHE_STORE.TABLE}`,
      'WHERE cache_kind = $1',
      '  AND locale = $2',
      '  AND expires_at > $3',
      "  AND COALESCE(current_post_slug, '') = COALESCE($4, '')",
      "  AND COALESCE(intent_cache_key, '') = COALESCE($6, '')",
      '  AND question_embedding IS NOT NULL',
      'ORDER BY question_embedding <=> $5::vector ASC',
      'LIMIT 1',
    ].join('\n'),
    [
      CHAT_RESPONSE_CACHE_STORE.KINDS.SEMANTIC,
      params.locale,
      resolveCacheTimestamp({ now: params.now }),
      params.currentPostSlug ?? null,
      buildPgvectorLiteral(params.questionEmbedding),
      params.intentCacheKey ?? null,
    ],
  )
  const cachedResponseRow = responseResult.rows[0]

  if (!cachedResponseRow) {
    return null
  }

  if (Number(cachedResponseRow.similarity) < params.minimumSimilarityScore) {
    return null
  }

  return parseCachedResponse(cachedResponseRow.response_json)
}

export async function saveSharedSemanticChatResponse(params: {
  locale: SupportedLocale
  question: string
  currentPostSlug?: string
  intentCacheKey?: string
  questionEmbedding: number[]
  response: BlogChatResponse
  ttlMilliseconds: number
  now?: number
}): Promise<void> {
  await saveSharedChatResponse({
    cacheKey: buildSemanticCacheKey({
      locale: params.locale,
      currentPostSlug: params.currentPostSlug,
      intentCacheKey: params.intentCacheKey,
      question: params.question,
    }),
    cacheKind: CHAT_RESPONSE_CACHE_STORE.KINDS.SEMANTIC,
    locale: params.locale,
    currentPostSlug: params.currentPostSlug,
    intentCacheKey: params.intentCacheKey,
    questionEmbedding: params.questionEmbedding,
    response: params.response,
    ttlMilliseconds: params.ttlMilliseconds,
    now: params.now,
  })
}

export async function deleteExpiredSharedChatResponses(params: {
  now?: number
}): Promise<void> {
  const databasePool: Pool | PoolClient = await getChatRagDatabasePool()

  await databasePool.query(
    [
      `DELETE FROM ${CHAT_RESPONSE_CACHE_STORE.TABLE}`,
      'WHERE expires_at <= $1',
    ].join('\n'),
    [resolveCacheTimestamp({ now: params.now })],
  )
}
