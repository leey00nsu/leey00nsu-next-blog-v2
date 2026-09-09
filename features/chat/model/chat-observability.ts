import type { Pool, PoolClient } from 'pg'
import { BLOG_CHAT } from '@/features/chat/config/constants'
import {
  getChatRagDatabasePool,
  isChatRagDatabaseConfigured,
} from '@/features/chat/model/chat-rag-database'
import type { ChatSourceCategory } from '@/features/chat/model/chat-evidence'
import type { BlogChatResponse } from '@/features/chat/model/chat-schema'
import type { SupportedLocale } from '@/shared/config/constants'
import {
  getDefaultAnalyticsDateRange,
  toAnalyticsDatabaseRange,
} from '@/shared/lib/analytics-date-range'
import type { AnalyticsDateRange } from '@/shared/model/analytics'

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
  intentOperation?: string | null
  intentTargetKind?: string | null
  intentEvidenceScope?: string | null
  intentTemporalOrder?: string | null
  intentRequestedFields?: string[]
  intentRequiredConcepts?: string[]
  intentOptionalConcepts?: string[]
  plannerFailureKind?: string | null
  queryOperation?: string | null
  sourceStrategy?: string | null
  sourceCategories?: string[]
  temporalStrategy?: string | null
  temporalOrder?: string | null
  executionKind?: string | null
  graphPath?: string[]
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
  dateRange: AnalyticsDateRange
}

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
    intentOperation:
      typeof row.intent_operation === 'string' ? row.intent_operation : null,
    intentTargetKind:
      typeof row.intent_target_kind === 'string'
        ? row.intent_target_kind
        : null,
    intentEvidenceScope:
      typeof row.intent_evidence_scope === 'string'
        ? row.intent_evidence_scope
        : null,
    intentTemporalOrder:
      typeof row.intent_temporal_order === 'string'
        ? row.intent_temporal_order
        : null,
    intentRequestedFields: parseJsonArray<string>(
      row.intent_requested_fields_json,
    ),
    intentRequiredConcepts: parseJsonArray<string>(
      row.intent_required_concepts_json,
    ),
    intentOptionalConcepts: parseJsonArray<string>(
      row.intent_optional_concepts_json,
    ),
    plannerFailureKind:
      typeof row.planner_failure_kind === 'string'
        ? row.planner_failure_kind
        : null,
    queryOperation:
      typeof row.query_operation === 'string' ? row.query_operation : null,
    sourceStrategy:
      typeof row.source_strategy === 'string' ? row.source_strategy : null,
    sourceCategories: parseJsonArray<string>(row.source_categories_json),
    temporalStrategy:
      typeof row.temporal_strategy === 'string' ? row.temporal_strategy : null,
    temporalOrder:
      typeof row.temporal_order === 'string' ? row.temporal_order : null,
    executionKind:
      typeof row.execution_kind === 'string' ? row.execution_kind : null,
    graphPath: parseJsonArray<string>(row.graph_path_json),
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
        intent_operation,
        intent_target_kind,
        intent_evidence_scope,
        intent_temporal_order,
        intent_requested_fields_json,
        intent_required_concepts_json,
        intent_optional_concepts_json,
        planner_failure_kind,
        query_operation,
        source_strategy,
        source_categories_json,
        temporal_strategy,
        temporal_order,
        execution_kind,
        graph_path_json,
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
        $1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, NULL, NULL,
        $10, $11, $12, $13, $14::jsonb, $15::jsonb, $16::jsonb, $17,
        $18, $19, $20::jsonb, $21, $22, $23, $24::jsonb,
        '[]'::jsonb, '[]'::jsonb, $25::jsonb, $26::jsonb, $27::jsonb,
        $28::jsonb, $29, $30, $31
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
      event.intentOperation ?? null,
      event.intentTargetKind ?? null,
      event.intentEvidenceScope ?? null,
      event.intentTemporalOrder ?? null,
      JSON.stringify(event.intentRequestedFields ?? []),
      JSON.stringify(event.intentRequiredConcepts ?? []),
      JSON.stringify(event.intentOptionalConcepts ?? []),
      event.plannerFailureKind ?? null,
      event.queryOperation ?? null,
      event.sourceStrategy ?? null,
      JSON.stringify(event.sourceCategories ?? []),
      event.temporalStrategy ?? null,
      event.temporalOrder ?? null,
      event.executionKind ?? null,
      JSON.stringify(event.graphPath ?? []),
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
  dateRange?: AnalyticsDateRange
}): Promise<ChatObservabilityLogPage> {
  const page = normalizeChatObservabilityPage(params.page)
  const pageSize = normalizeChatObservabilityPageSize(params.pageSize)
  const sortDirection = normalizeChatObservabilitySortDirection(
    params.sortDirection,
  )
  const orderDirection =
    sortDirection === CHAT_OBSERVABILITY.SORT_DIRECTIONS.CREATED_AT_ASCENDING
      ? 'ASC'
      : 'DESC'
  const offset = (page - CHAT_OBSERVABILITY.MINIMUM_PAGE) * pageSize
  const dateRange = params.dateRange ?? getDefaultAnalyticsDateRange()
  const databaseRange = toAnalyticsDatabaseRange(dateRange)
  const countResult = await params.databaseClient.query(
    `
      SELECT COUNT(*)::int AS total_count
      FROM ${CHAT_OBSERVABILITY.TABLE}
      WHERE created_at >= $1::timestamptz
        AND created_at < $2::timestamptz
    `,
    [databaseRange.startDateTime, databaseRange.endDateTimeExclusive],
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
        intent_operation,
        intent_target_kind,
        intent_evidence_scope,
        intent_temporal_order,
        intent_requested_fields_json,
        intent_required_concepts_json,
        intent_optional_concepts_json,
        planner_failure_kind,
        query_operation,
        source_strategy,
        source_categories_json,
        temporal_strategy,
        temporal_order,
        execution_kind,
        graph_path_json,
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
      WHERE created_at >= $1::timestamptz
        AND created_at < $2::timestamptz
      ORDER BY created_at ${orderDirection}
      LIMIT $3 OFFSET $4
    `,
    [
      databaseRange.startDateTime,
      databaseRange.endDateTimeExclusive,
      pageSize,
      offset,
    ],
  )

  return {
    records: recordsResult.rows.map((recordRow) =>
      mapChatObservabilityRow(recordRow),
    ),
    totalCount: Number(countResult.rows[0]?.total_count ?? 0),
    page,
    pageSize,
    sortDirection,
    dateRange,
  }
}

export async function getChatObservabilityLogPage(params: {
  page: number
  pageSize: number
  sortDirection?: string
  dateRange?: AnalyticsDateRange
}): Promise<ChatObservabilityLogPage> {
  const page = normalizeChatObservabilityPage(params.page)
  const pageSize = normalizeChatObservabilityPageSize(params.pageSize)
  const sortDirection = normalizeChatObservabilitySortDirection(
    params.sortDirection,
  )
  const dateRange = params.dateRange ?? getDefaultAnalyticsDateRange()

  if (!isChatRagDatabaseConfigured()) {
    return {
      records: [],
      totalCount: 0,
      page,
      pageSize,
      sortDirection,
      dateRange,
    }
  }

  const databasePool = await getChatRagDatabasePool()

  return selectChatObservabilityLogPage({
    databaseClient: databasePool,
    page,
    pageSize,
    sortDirection,
    dateRange,
  })
}
