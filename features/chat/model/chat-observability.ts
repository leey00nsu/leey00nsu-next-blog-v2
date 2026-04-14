import type { Pool, PoolClient } from 'pg'
import { BLOG_CHAT } from '@/features/chat/config/constants'
import {
  getChatRagDatabasePool,
  isChatRagDatabaseConfigured,
} from '@/features/chat/model/chat-rag-database'
import type { ChatSourceCategory } from '@/features/chat/model/chat-evidence'
import type { BlogChatResponse } from '@/features/chat/model/chat-schema'
import type { SupportedLocale } from '@/shared/config/constants'

const CHAT_OBSERVABILITY = {
  TABLE: 'chat_observability_events',
} as const

interface ChatObservabilityMatchSummary {
  url: string
  title: string
  sourceCategory: ChatSourceCategory
}

export interface ChatObservabilityEvent {
  locale: SupportedLocale
  originalQuestion: string
  resolvedQuestion: string | null
  normalizedQuestion: string | null
  currentPostSlug?: string
  cacheKind: 'none' | 'exact' | 'semantic'
  reranked: boolean
  plannerReason: string | null
  plannerAction: string | null
  plannerRetrievalMode: string | null
  plannerDeterministicAction: string | null
  preferredSourceCategories: string[]
  additionalKeywords: string[]
  lexicalMatches: ChatObservabilityMatchSummary[]
  semanticMatches: ChatObservabilityMatchSummary[]
  finalMatches: ChatObservabilityMatchSummary[]
  citations: ChatObservabilityMatchSummary[]
  grounded: boolean
  refusalReason: BlogChatResponse['refusalReason'] | null
  durationMilliseconds: number
}

let hasInitializedChatObservabilityDatabase = false

export async function initializeChatObservabilityDatabase(
  databaseClient: Pool | PoolClient,
): Promise<void> {
  await databaseClient.query(`
    CREATE TABLE IF NOT EXISTS ${CHAT_OBSERVABILITY.TABLE} (
      id BIGSERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      locale TEXT NOT NULL,
      original_question TEXT NOT NULL,
      resolved_question TEXT,
      normalized_question TEXT,
      current_post_slug TEXT,
      cache_kind TEXT NOT NULL,
      reranked BOOLEAN NOT NULL DEFAULT FALSE,
      planner_reason TEXT,
      planner_action TEXT,
      planner_retrieval_mode TEXT,
      planner_deterministic_action TEXT,
      preferred_source_categories_json JSONB NOT NULL,
      additional_keywords_json JSONB NOT NULL,
      lexical_matches_json JSONB NOT NULL,
      semantic_matches_json JSONB NOT NULL,
      final_matches_json JSONB NOT NULL,
      citations_json JSONB NOT NULL,
      grounded BOOLEAN NOT NULL,
      refusal_reason TEXT,
      duration_milliseconds INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS chat_observability_events_created_at_index
    ON ${CHAT_OBSERVABILITY.TABLE}(created_at DESC);
  `)
}

export async function insertChatObservabilityEvent(params: {
  databaseClient: Pool | PoolClient
  event: ChatObservabilityEvent
}): Promise<void> {
  const { event } = params

  await params.databaseClient.query(
    `
      INSERT INTO ${CHAT_OBSERVABILITY.TABLE} (
        locale,
        original_question,
        resolved_question,
        normalized_question,
        current_post_slug,
        cache_kind,
        reranked,
        planner_reason,
        planner_action,
        planner_retrieval_mode,
        planner_deterministic_action,
        preferred_source_categories_json,
        additional_keywords_json,
        lexical_matches_json,
        semantic_matches_json,
        final_matches_json,
        citations_json,
        grounded,
        refusal_reason,
        duration_milliseconds
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
        $12::jsonb, $13::jsonb, $14::jsonb, $15::jsonb, $16::jsonb, $17::jsonb,
        $18, $19, $20
      )
    `,
    [
      event.locale,
      event.originalQuestion,
      event.resolvedQuestion,
      event.normalizedQuestion,
      event.currentPostSlug ?? null,
      event.cacheKind,
      event.reranked,
      event.plannerReason,
      event.plannerAction,
      event.plannerRetrievalMode,
      event.plannerDeterministicAction,
      JSON.stringify(event.preferredSourceCategories),
      JSON.stringify(event.additionalKeywords),
      JSON.stringify(event.lexicalMatches),
      JSON.stringify(event.semanticMatches),
      JSON.stringify(event.finalMatches),
      JSON.stringify(event.citations),
      event.grounded,
      event.refusalReason,
      event.durationMilliseconds,
    ],
  )
}

export async function recordChatObservabilityEvent(
  event: ChatObservabilityEvent,
): Promise<void> {
  if (!isChatRagDatabaseConfigured()) {
    return
  }

  const databasePool = await getChatRagDatabasePool()

  if (!hasInitializedChatObservabilityDatabase) {
    await initializeChatObservabilityDatabase(databasePool)
    hasInitializedChatObservabilityDatabase = true
  }

  const limitedEvent = {
    ...event,
    lexicalMatches: event.lexicalMatches.slice(
      0,
      BLOG_CHAT.OBSERVABILITY.MAXIMUM_LOGGED_MATCH_COUNT,
    ),
    semanticMatches: event.semanticMatches.slice(
      0,
      BLOG_CHAT.OBSERVABILITY.MAXIMUM_LOGGED_MATCH_COUNT,
    ),
    finalMatches: event.finalMatches.slice(
      0,
      BLOG_CHAT.OBSERVABILITY.MAXIMUM_LOGGED_MATCH_COUNT,
    ),
    citations: event.citations.slice(
      0,
      BLOG_CHAT.OBSERVABILITY.MAXIMUM_LOGGED_MATCH_COUNT,
    ),
  }

  await insertChatObservabilityEvent({
    databaseClient: databasePool,
    event: limitedEvent,
  })
}
