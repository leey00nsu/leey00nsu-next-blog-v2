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
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  DEFAULT_SORT_DIRECTION: 'created_at_desc',
  MINIMUM_PAGE: 1,
  MINIMUM_PAGE_SIZE: 1,
  MAXIMUM_PAGE_SIZE: 100,
  SORT_DIRECTIONS: {
    CREATED_AT_ASCENDING: 'created_at_asc',
    CREATED_AT_DESCENDING: 'created_at_desc',
  },
} as const

export type ChatObservabilitySortDirection =
  (typeof CHAT_OBSERVABILITY.SORT_DIRECTIONS)[keyof typeof CHAT_OBSERVABILITY.SORT_DIRECTIONS]

interface ChatObservabilityMatchSummary {
  url: string
  title: string
  sourceCategory: ChatSourceCategory
}

export interface ChatObservabilityEvent {
  locale: SupportedLocale
  originalQuestion: string
  answer: string
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

export interface ChatObservabilityLogRecord extends ChatObservabilityEvent {
  id: string
  createdAt: string
}

export interface ChatObservabilityLogPage {
  records: ChatObservabilityLogRecord[]
  totalCount: number
  page: number
  pageSize: number
  sortDirection: ChatObservabilitySortDirection
}

let hasInitializedChatObservabilityDatabase = false

function parseJsonArray<T>(jsonValue: unknown): T[] {
  if (Array.isArray(jsonValue)) {
    return jsonValue as T[]
  }

  if (typeof jsonValue !== 'string') {
    return []
  }

  return JSON.parse(jsonValue) as T[]
}

function normalizeChatObservabilityPage(value: number): number {
  return Number.isFinite(value) && value >= CHAT_OBSERVABILITY.MINIMUM_PAGE
    ? Math.floor(value)
    : CHAT_OBSERVABILITY.DEFAULT_PAGE
}

function normalizeChatObservabilityPageSize(value: number): number {
  if (!Number.isFinite(value)) {
    return CHAT_OBSERVABILITY.DEFAULT_PAGE_SIZE
  }

  return Math.min(
    CHAT_OBSERVABILITY.MAXIMUM_PAGE_SIZE,
    Math.max(CHAT_OBSERVABILITY.MINIMUM_PAGE_SIZE, Math.floor(value)),
  )
}

function normalizeChatObservabilitySortDirection(
  sortDirection: string | undefined,
): ChatObservabilitySortDirection {
  return Object.values(CHAT_OBSERVABILITY.SORT_DIRECTIONS).includes(
    sortDirection as ChatObservabilitySortDirection,
  )
    ? (sortDirection as ChatObservabilitySortDirection)
    : CHAT_OBSERVABILITY.DEFAULT_SORT_DIRECTION
}

function mapChatObservabilityRow(
  row: Record<string, unknown>,
): ChatObservabilityLogRecord {
  return {
    id: String(row.id),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    locale: row.locale as SupportedLocale,
    originalQuestion: String(row.original_question),
    answer: typeof row.answer === 'string' ? row.answer : '',
    resolvedQuestion:
      typeof row.resolved_question === 'string' ? row.resolved_question : null,
    normalizedQuestion:
      typeof row.normalized_question === 'string'
        ? row.normalized_question
        : null,
    currentPostSlug:
      typeof row.current_post_slug === 'string'
        ? row.current_post_slug
        : undefined,
    cacheKind: row.cache_kind as ChatObservabilityEvent['cacheKind'],
    reranked: Boolean(row.reranked),
    plannerReason:
      typeof row.planner_reason === 'string' ? row.planner_reason : null,
    plannerAction:
      typeof row.planner_action === 'string' ? row.planner_action : null,
    plannerRetrievalMode:
      typeof row.planner_retrieval_mode === 'string'
        ? row.planner_retrieval_mode
        : null,
    plannerDeterministicAction:
      typeof row.planner_deterministic_action === 'string'
        ? row.planner_deterministic_action
        : null,
    preferredSourceCategories: parseJsonArray<string>(
      row.preferred_source_categories_json,
    ),
    additionalKeywords: parseJsonArray<string>(row.additional_keywords_json),
    lexicalMatches: parseJsonArray<ChatObservabilityMatchSummary>(
      row.lexical_matches_json,
    ),
    semanticMatches: parseJsonArray<ChatObservabilityMatchSummary>(
      row.semantic_matches_json,
    ),
    finalMatches: parseJsonArray<ChatObservabilityMatchSummary>(
      row.final_matches_json,
    ),
    citations: parseJsonArray<ChatObservabilityMatchSummary>(
      row.citations_json,
    ),
    grounded: Boolean(row.grounded),
    refusalReason:
      typeof row.refusal_reason === 'string'
        ? (row.refusal_reason as BlogChatResponse['refusalReason'])
        : null,
    durationMilliseconds: Number(row.duration_milliseconds),
  }
}

export async function initializeChatObservabilityDatabase(
  databaseClient: Pool | PoolClient,
): Promise<void> {
  await databaseClient.query(`
    CREATE TABLE IF NOT EXISTS ${CHAT_OBSERVABILITY.TABLE} (
      id BIGSERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      locale TEXT NOT NULL,
      original_question TEXT NOT NULL,
      answer TEXT,
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

    ALTER TABLE ${CHAT_OBSERVABILITY.TABLE}
    ADD COLUMN IF NOT EXISTS answer TEXT;

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
        answer,
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
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
        $13::jsonb, $14::jsonb, $15::jsonb, $16::jsonb, $17::jsonb, $18::jsonb,
        $19, $20, $21
      )
    `,
    [
      event.locale,
      event.originalQuestion,
      event.answer,
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

export async function selectChatObservabilityLogPage(params: {
  databaseClient: Pool | PoolClient
  page: number
  pageSize: number
  sortDirection?: string
}): Promise<ChatObservabilityLogPage> {
  const page = normalizeChatObservabilityPage(params.page)
  const pageSize = normalizeChatObservabilityPageSize(params.pageSize)
  const sortDirection = normalizeChatObservabilitySortDirection(
    params.sortDirection,
  )
  const orderDirection =
    sortDirection ===
    CHAT_OBSERVABILITY.SORT_DIRECTIONS.CREATED_AT_ASCENDING
      ? 'ASC'
      : 'DESC'
  const offset = (page - CHAT_OBSERVABILITY.MINIMUM_PAGE) * pageSize
  const countResult = await params.databaseClient.query(
    `SELECT COUNT(*)::int AS total_count FROM ${CHAT_OBSERVABILITY.TABLE}`,
  )
  const recordsResult = await params.databaseClient.query(
    `
      SELECT
        id,
        created_at,
        locale,
        original_question,
        answer,
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
      FROM ${CHAT_OBSERVABILITY.TABLE}
      ORDER BY created_at ${orderDirection}
      LIMIT $1 OFFSET $2
    `,
    [pageSize, offset],
  )

  return {
    records: recordsResult.rows.map((recordRow) =>
      mapChatObservabilityRow(recordRow),
    ),
    totalCount: Number(countResult.rows[0]?.total_count ?? 0),
    page,
    pageSize,
    sortDirection,
  }
}

export async function getChatObservabilityLogPage(params: {
  page: number
  pageSize: number
  sortDirection?: string
}): Promise<ChatObservabilityLogPage> {
  const page = normalizeChatObservabilityPage(params.page)
  const pageSize = normalizeChatObservabilityPageSize(params.pageSize)
  const sortDirection = normalizeChatObservabilitySortDirection(
    params.sortDirection,
  )

  if (!isChatRagDatabaseConfigured()) {
    return {
      records: [],
      totalCount: 0,
      page,
      pageSize,
      sortDirection,
    }
  }

  const databasePool = await getChatRagDatabasePool()

  if (!hasInitializedChatObservabilityDatabase) {
    await initializeChatObservabilityDatabase(databasePool)
    hasInitializedChatObservabilityDatabase = true
  }

  return selectChatObservabilityLogPage({
    databaseClient: databasePool,
    page,
    pageSize,
    sortDirection,
  })
}
