import type { Pool, PoolClient } from 'pg'
import { Pool as PostgresPool } from 'pg'
import {
  ENGAGEMENT,
  type EngagementEventName,
  type EngagementEventSortDirection,
  type EngagementTargetKind,
} from '@/features/engagement/config/constants'
import type { EngagementEventPayload } from '@/features/engagement/model/engagement-event-schema'
import type {
  PdfDocumentKind,
  SupportedLocale,
} from '@/shared/config/constants'
import {
  getDefaultAnalyticsDateRange,
  toAnalyticsDatabaseRange,
} from '@/shared/lib/analytics-date-range'
import type { AnalyticsDateRange } from '@/shared/model/analytics'

const ENGAGEMENT_DATABASE = {
  TABLE: 'engagement_events',
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MINIMUM_PAGE: 1,
  MINIMUM_PAGE_SIZE: 1,
  MAXIMUM_PAGE_SIZE: 100,
  DEFAULT_MAXIMUM_CONNECTIONS: 5,
} as const

const ALLOWED_EVENT_NAMES_SQL = Object.values(ENGAGEMENT.EVENT_NAME)
  .map((eventName) => `'${eventName}'`)
  .join(', ')

export type EngagementDeviceCategory =
  | 'desktop'
  | 'mobile'
  | 'tablet'
  | 'unknown'

export interface EngagementEventRecord {
  eventId: string
  createdAt: string
  eventName: EngagementEventName
  locale: SupportedLocale
  pagePath: string
  contentSlug: string | null
  documentKind: PdfDocumentKind | null
  targetKind: EngagementTargetKind | null
  referrerHost: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  deviceCategory: EngagementDeviceCategory
  anonymousVisitorIdHash: string
  sessionIdHash: string
}

export interface EngagementEventSummary {
  totalEventCount: number
  uniqueVisitorCount: number
  aboutViewCount: number
  blogListViewCount: number
  blogPostViewCount: number
  resumeDownloadCount: number
  portfolioDownloadCount: number
  contactClickCount: number
}

export interface EngagementEventPage {
  records: EngagementEventRecord[]
  summary: EngagementEventSummary
  totalCount: number
  page: number
  pageSize: number
  sortDirection: EngagementEventSortDirection
  eventName?: EngagementEventName
  dateRange: AnalyticsDateRange
}

export interface StoredEngagementEvent extends EngagementEventPayload {
  anonymousVisitorIdHash: string
  sessionIdHash: string
  deviceCategory: EngagementDeviceCategory
}

export interface EngagementDatabaseConfiguration {
  url: string
  ssl: boolean
  maximumConnections: number
}

let engagementDatabasePoolSingleton: Pool | null = null
let engagementDatabaseInitializationPromise: Promise<void> | null = null

function getNonEmptyEnvironmentValue(
  environmentValue: string | undefined,
): string | undefined {
  const normalizedEnvironmentValue = environmentValue?.trim()

  return normalizedEnvironmentValue || undefined
}

export function getEngagementDatabaseConfiguration(): EngagementDatabaseConfiguration {
  const dedicatedEngagementDatabaseUrl = getNonEmptyEnvironmentValue(
    process.env.ENGAGEMENT_DATABASE_URL,
  )
  const fallbackDatabaseUrl =
    getNonEmptyEnvironmentValue(process.env.BLOG_CHAT_RAG_DATABASE_URL) ??
    getNonEmptyEnvironmentValue(process.env.DATABASE_URL) ??
    ''
  const configuredMaximumConnections = Number(
    process.env.ENGAGEMENT_DATABASE_MAXIMUM_CONNECTIONS ??
      ENGAGEMENT_DATABASE.DEFAULT_MAXIMUM_CONNECTIONS,
  )
  const maximumConnections =
    Number.isFinite(configuredMaximumConnections) &&
    configuredMaximumConnections > 0
      ? configuredMaximumConnections
      : ENGAGEMENT_DATABASE.DEFAULT_MAXIMUM_CONNECTIONS

  return {
    url: dedicatedEngagementDatabaseUrl ?? fallbackDatabaseUrl,
    ssl: dedicatedEngagementDatabaseUrl
      ? process.env.ENGAGEMENT_DATABASE_SSL === 'true'
      : process.env.BLOG_CHAT_RAG_DATABASE_SSL === 'true',
    maximumConnections,
  }
}

function normalizePage(value: number): number {
  return Number.isFinite(value) && value >= ENGAGEMENT_DATABASE.MINIMUM_PAGE
    ? Math.floor(value)
    : ENGAGEMENT_DATABASE.DEFAULT_PAGE
}

function normalizePageSize(value: number): number {
  if (!Number.isFinite(value)) {
    return ENGAGEMENT_DATABASE.DEFAULT_PAGE_SIZE
  }

  return Math.min(
    ENGAGEMENT_DATABASE.MAXIMUM_PAGE_SIZE,
    Math.max(ENGAGEMENT_DATABASE.MINIMUM_PAGE_SIZE, Math.floor(value)),
  )
}

function normalizeSortDirection(
  sortDirection: string | undefined,
): EngagementEventSortDirection {
  return Object.values(ENGAGEMENT.SORT_DIRECTION).includes(
    sortDirection as EngagementEventSortDirection,
  )
    ? (sortDirection as EngagementEventSortDirection)
    : ENGAGEMENT.SORT_DIRECTION.CREATED_AT_DESCENDING
}

function normalizeEventName(
  eventName: string | undefined,
): EngagementEventName | undefined {
  return Object.values(ENGAGEMENT.EVENT_NAME).includes(
    eventName as EngagementEventName,
  )
    ? (eventName as EngagementEventName)
    : undefined
}

function mapTimestamp(timestampValue: unknown): string {
  return timestampValue instanceof Date
    ? timestampValue.toISOString()
    : String(timestampValue)
}

function mapEngagementEventRow(
  row: Record<string, unknown>,
): EngagementEventRecord {
  return {
    eventId: String(row.event_id),
    createdAt: mapTimestamp(row.created_at),
    eventName: row.event_name as EngagementEventName,
    locale: row.locale as SupportedLocale,
    pagePath: String(row.page_path),
    contentSlug: typeof row.content_slug === 'string' ? row.content_slug : null,
    documentKind:
      typeof row.document_kind === 'string'
        ? (row.document_kind as PdfDocumentKind)
        : null,
    targetKind:
      typeof row.target_kind === 'string'
        ? (row.target_kind as EngagementTargetKind)
        : null,
    referrerHost:
      typeof row.referrer_host === 'string' ? row.referrer_host : null,
    utmSource: typeof row.utm_source === 'string' ? row.utm_source : null,
    utmMedium: typeof row.utm_medium === 'string' ? row.utm_medium : null,
    utmCampaign: typeof row.utm_campaign === 'string' ? row.utm_campaign : null,
    deviceCategory: row.device_category as EngagementDeviceCategory,
    anonymousVisitorIdHash: String(row.anonymous_visitor_id_hash),
    sessionIdHash: String(row.session_id_hash),
  }
}

export function isEngagementDatabaseConfigured(): boolean {
  return Boolean(getEngagementDatabaseConfiguration().url)
}

export function getEngagementDatabasePool(): Pool {
  if (!isEngagementDatabaseConfigured()) {
    throw new Error(
      'ENGAGEMENT_DATABASE_URL, BLOG_CHAT_RAG_DATABASE_URL, or DATABASE_URL is required to store engagement events.',
    )
  }

  if (engagementDatabasePoolSingleton) {
    return engagementDatabasePoolSingleton
  }

  const databaseConfiguration = getEngagementDatabaseConfiguration()
  engagementDatabasePoolSingleton = new PostgresPool({
    connectionString: databaseConfiguration.url,
    ssl: databaseConfiguration.ssl
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
    max: databaseConfiguration.maximumConnections,
  })

  return engagementDatabasePoolSingleton
}

export async function initializeEngagementDatabase(
  databaseClient: Pool | PoolClient,
): Promise<void> {
  await databaseClient.query(`
    CREATE TABLE IF NOT EXISTS ${ENGAGEMENT_DATABASE.TABLE} (
      event_id UUID PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      event_name TEXT NOT NULL,
      anonymous_visitor_id_hash TEXT NOT NULL,
      session_id_hash TEXT NOT NULL,
      locale TEXT NOT NULL,
      page_path TEXT NOT NULL,
      content_slug TEXT,
      document_kind TEXT,
      target_kind TEXT,
      referrer_host TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      device_category TEXT NOT NULL
    );

    ALTER TABLE ${ENGAGEMENT_DATABASE.TABLE}
    ADD COLUMN IF NOT EXISTS content_slug TEXT;

    ALTER TABLE ${ENGAGEMENT_DATABASE.TABLE}
    DROP CONSTRAINT IF EXISTS engagement_events_event_name_check;

    ALTER TABLE ${ENGAGEMENT_DATABASE.TABLE}
    ADD CONSTRAINT engagement_events_event_name_check
    CHECK (event_name IN (${ALLOWED_EVENT_NAMES_SQL}));

    CREATE INDEX IF NOT EXISTS engagement_events_name_created_at_index
    ON ${ENGAGEMENT_DATABASE.TABLE}(event_name, created_at DESC);

    CREATE INDEX IF NOT EXISTS engagement_events_created_at_index
    ON ${ENGAGEMENT_DATABASE.TABLE}(created_at DESC);

    CREATE INDEX IF NOT EXISTS engagement_events_visitor_created_at_index
    ON ${ENGAGEMENT_DATABASE.TABLE}(anonymous_visitor_id_hash, created_at DESC);

    CREATE INDEX IF NOT EXISTS engagement_events_content_slug_created_at_index
    ON ${ENGAGEMENT_DATABASE.TABLE}(content_slug, created_at DESC)
    WHERE content_slug IS NOT NULL;
  `)
}

export async function ensureEngagementDatabaseInitialized(
  databaseClient: Pool,
): Promise<void> {
  if (!engagementDatabaseInitializationPromise) {
    engagementDatabaseInitializationPromise =
      initializeEngagementDatabase(databaseClient)
  }

  try {
    await engagementDatabaseInitializationPromise
  } catch (error) {
    engagementDatabaseInitializationPromise = null
    throw error
  }
}

export async function insertEngagementEvent(params: {
  databaseClient: Pool | PoolClient
  event: StoredEngagementEvent
}): Promise<void> {
  const { event } = params

  await params.databaseClient.query(
    `
      INSERT INTO ${ENGAGEMENT_DATABASE.TABLE} (
        event_id,
        event_name,
        anonymous_visitor_id_hash,
        session_id_hash,
        locale,
        page_path,
        content_slug,
        document_kind,
        target_kind,
        referrer_host,
        utm_source,
        utm_medium,
        utm_campaign,
        device_category
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )
      ON CONFLICT (event_id) DO NOTHING
    `,
    [
      event.eventId,
      event.eventName,
      event.anonymousVisitorIdHash,
      event.sessionIdHash,
      event.locale,
      event.pagePath,
      event.contentSlug ?? null,
      event.documentKind ?? null,
      event.targetKind ?? null,
      event.referrerHost ?? null,
      event.utmSource ?? null,
      event.utmMedium ?? null,
      event.utmCampaign ?? null,
      event.deviceCategory,
    ],
  )
}

export async function recordEngagementEvent(
  event: StoredEngagementEvent,
): Promise<void> {
  const databasePool = getEngagementDatabasePool()
  await ensureEngagementDatabaseInitialized(databasePool)
  await insertEngagementEvent({ databaseClient: databasePool, event })
}

export async function selectEngagementEventPage(params: {
  databaseClient: Pool | PoolClient
  page: number
  pageSize: number
  sortDirection?: string
  eventName?: string
  dateRange?: AnalyticsDateRange
}): Promise<EngagementEventPage> {
  const page = normalizePage(params.page)
  const pageSize = normalizePageSize(params.pageSize)
  const sortDirection = normalizeSortDirection(params.sortDirection)
  const eventName = normalizeEventName(params.eventName)
  const orderDirection =
    sortDirection === ENGAGEMENT.SORT_DIRECTION.CREATED_AT_ASCENDING
      ? 'ASC'
      : 'DESC'
  const offset = (page - ENGAGEMENT_DATABASE.MINIMUM_PAGE) * pageSize
  const eventNameFilter = eventName ?? null
  const dateRange = params.dateRange ?? getDefaultAnalyticsDateRange()
  const databaseRange = toAnalyticsDatabaseRange(dateRange)
  const summaryResult = await params.databaseClient.query(
    `
      SELECT
        COUNT(*)::int AS total_event_count,
        COUNT(DISTINCT anonymous_visitor_id_hash)::int AS unique_visitor_count,
        COUNT(*) FILTER (
          WHERE event_name = '${ENGAGEMENT.EVENT_NAME.ABOUT_VIEW}'
        )::int AS about_view_count,
        COUNT(*) FILTER (
          WHERE event_name = '${ENGAGEMENT.EVENT_NAME.BLOG_LIST_VIEW}'
        )::int AS blog_list_view_count,
        COUNT(*) FILTER (
          WHERE event_name = '${ENGAGEMENT.EVENT_NAME.BLOG_POST_VIEW}'
        )::int AS blog_post_view_count,
        COUNT(*) FILTER (
          WHERE event_name = '${ENGAGEMENT.EVENT_NAME.RESUME_DOWNLOAD}'
        )::int AS resume_download_count,
        COUNT(*) FILTER (
          WHERE event_name = '${ENGAGEMENT.EVENT_NAME.PORTFOLIO_DOWNLOAD}'
        )::int AS portfolio_download_count,
        COUNT(*) FILTER (
          WHERE event_name = '${ENGAGEMENT.EVENT_NAME.CONTACT_CLICK}'
        )::int AS contact_click_count
      FROM ${ENGAGEMENT_DATABASE.TABLE}
      WHERE created_at >= $1::timestamptz
        AND created_at < $2::timestamptz
    `,
    [databaseRange.startDateTime, databaseRange.endDateTimeExclusive],
  )
  const countResult = await params.databaseClient.query(
    `
      SELECT COUNT(*)::int AS total_count
      FROM ${ENGAGEMENT_DATABASE.TABLE}
      WHERE created_at >= $1::timestamptz
        AND created_at < $2::timestamptz
        AND ($3::text IS NULL OR event_name = $3)
    `,
    [
      databaseRange.startDateTime,
      databaseRange.endDateTimeExclusive,
      eventNameFilter,
    ],
  )
  const recordsResult = await params.databaseClient.query(
    `
      SELECT
        event_id,
        created_at,
        event_name,
        anonymous_visitor_id_hash,
        session_id_hash,
        locale,
        page_path,
        content_slug,
        document_kind,
        target_kind,
        referrer_host,
        utm_source,
        utm_medium,
        utm_campaign,
        device_category
      FROM ${ENGAGEMENT_DATABASE.TABLE}
      WHERE created_at >= $1::timestamptz
        AND created_at < $2::timestamptz
        AND ($3::text IS NULL OR event_name = $3)
      ORDER BY created_at ${orderDirection}
      LIMIT $4 OFFSET $5
    `,
    [
      databaseRange.startDateTime,
      databaseRange.endDateTimeExclusive,
      eventNameFilter,
      pageSize,
      offset,
    ],
  )
  const summaryRow = summaryResult.rows[0] ?? {}

  return {
    records: recordsResult.rows.map((row) => mapEngagementEventRow(row)),
    summary: {
      totalEventCount: Number(summaryRow.total_event_count ?? 0),
      uniqueVisitorCount: Number(summaryRow.unique_visitor_count ?? 0),
      aboutViewCount: Number(summaryRow.about_view_count ?? 0),
      blogListViewCount: Number(summaryRow.blog_list_view_count ?? 0),
      blogPostViewCount: Number(summaryRow.blog_post_view_count ?? 0),
      resumeDownloadCount: Number(summaryRow.resume_download_count ?? 0),
      portfolioDownloadCount: Number(summaryRow.portfolio_download_count ?? 0),
      contactClickCount: Number(summaryRow.contact_click_count ?? 0),
    },
    totalCount: Number(countResult.rows[0]?.total_count ?? 0),
    page,
    pageSize,
    sortDirection,
    eventName,
    dateRange,
  }
}

export async function getEngagementEventPage(params: {
  page: number
  pageSize: number
  sortDirection?: string
  eventName?: string
  dateRange?: AnalyticsDateRange
}): Promise<EngagementEventPage> {
  const databasePool = getEngagementDatabasePool()
  await ensureEngagementDatabaseInitialized(databasePool)

  return selectEngagementEventPage({
    databaseClient: databasePool,
    ...params,
  })
}
