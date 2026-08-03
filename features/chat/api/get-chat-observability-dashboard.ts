import type { Pool, PoolClient } from 'pg'
import { z } from 'zod'
import {
  getChatRagDatabasePool,
  isChatRagDatabaseConfigured,
} from '@/features/chat/model/chat-rag-database'
import { ensureChatObservabilityDatabaseInitialized } from '@/features/chat/model/chat-observability'
import type { ChatObservabilityDashboard } from '@/features/chat/model/chat-observability-dashboard-types'
import { toAnalyticsDatabaseRange } from '@/shared/lib/analytics-date-range'
import type { AnalyticsDateRange } from '@/shared/model/analytics'

const CHAT_OBSERVABILITY_DASHBOARD = {
  TABLE: 'chat_observability_events',
  EMPTY_VALUE: 0,
  REQUEST_COUNT_KEY: 'requestCount',
  PERCENTAGE_MULTIPLIER: 100,
} as const

const ChatObservabilitySummaryRowSchema = z.object({
  total_request_count: z.coerce.number().int().nonnegative(),
  average_duration_milliseconds: z.coerce.number().nonnegative(),
  grounded_rate: z.coerce.number().nonnegative(),
  cache_hit_rate: z.coerce.number().nonnegative(),
})

const ChatObservabilityTimeSeriesRowSchema = z.object({
  date: z.coerce.string(),
  request_count: z.coerce.number().int().nonnegative(),
})

export async function selectChatObservabilityDashboard(params: {
  databaseClient: Pool | PoolClient
  dateRange: AnalyticsDateRange
}): Promise<ChatObservabilityDashboard> {
  const databaseRange = toAnalyticsDatabaseRange(params.dateRange)
  const summaryResult = await params.databaseClient.query(
    `
      SELECT
        COUNT(*)::int AS total_request_count,
        COALESCE(AVG(duration_milliseconds), 0)::float8 AS average_duration_milliseconds,
        COALESCE(
          AVG(CASE WHEN grounded THEN 1.0 ELSE 0.0 END) * $3,
          0
        )::float8 AS grounded_rate,
        COALESCE(
          AVG(CASE WHEN cache_kind <> 'none' THEN 1.0 ELSE 0.0 END) * $3,
          0
        )::float8 AS cache_hit_rate
      FROM ${CHAT_OBSERVABILITY_DASHBOARD.TABLE}
      WHERE created_at >= $1::timestamptz
        AND created_at < $2::timestamptz
    `,
    [
      databaseRange.startDateTime,
      databaseRange.endDateTimeExclusive,
      CHAT_OBSERVABILITY_DASHBOARD.PERCENTAGE_MULTIPLIER,
    ],
  )
  const timeSeriesResult = await params.databaseClient.query(
    `
      WITH daily_requests AS (
        SELECT
          DATE(created_at AT TIME ZONE $3) AS date,
          COUNT(*)::int AS request_count
        FROM ${CHAT_OBSERVABILITY_DASHBOARD.TABLE}
        WHERE created_at >= $4::timestamptz
          AND created_at < $5::timestamptz
        GROUP BY DATE(created_at AT TIME ZONE $3)
      )
      SELECT
        generated_date::date::text AS date,
        COALESCE(daily_requests.request_count, 0)::int AS request_count
      FROM generate_series(
        $1::date,
        $2::date,
        INTERVAL '1 day'
      ) AS generated_date
      LEFT JOIN daily_requests
        ON daily_requests.date = generated_date::date
      ORDER BY generated_date
    `,
    [
      databaseRange.startDate,
      databaseRange.endDate,
      databaseRange.timeZone,
      databaseRange.startDateTime,
      databaseRange.endDateTimeExclusive,
    ],
  )
  const summaryRow = ChatObservabilitySummaryRowSchema.parse(
    summaryResult.rows[0] ?? {
      total_request_count: CHAT_OBSERVABILITY_DASHBOARD.EMPTY_VALUE,
      average_duration_milliseconds: CHAT_OBSERVABILITY_DASHBOARD.EMPTY_VALUE,
      grounded_rate: CHAT_OBSERVABILITY_DASHBOARD.EMPTY_VALUE,
      cache_hit_rate: CHAT_OBSERVABILITY_DASHBOARD.EMPTY_VALUE,
    },
  )

  return {
    summary: {
      totalRequestCount: summaryRow.total_request_count,
      averageDurationMilliseconds: summaryRow.average_duration_milliseconds,
      groundedRate: summaryRow.grounded_rate,
      cacheHitRate: summaryRow.cache_hit_rate,
    },
    timeSeries: timeSeriesResult.rows.map((row) => {
      const timeSeriesRow = ChatObservabilityTimeSeriesRowSchema.parse(row)

      return {
        date: timeSeriesRow.date,
        values: {
          [CHAT_OBSERVABILITY_DASHBOARD.REQUEST_COUNT_KEY]:
            timeSeriesRow.request_count,
        },
      }
    }),
    dateRange: params.dateRange,
  }
}

export async function getChatObservabilityDashboard(
  dateRange: AnalyticsDateRange,
): Promise<ChatObservabilityDashboard> {
  if (!isChatRagDatabaseConfigured()) {
    return {
      summary: {
        totalRequestCount: CHAT_OBSERVABILITY_DASHBOARD.EMPTY_VALUE,
        averageDurationMilliseconds: CHAT_OBSERVABILITY_DASHBOARD.EMPTY_VALUE,
        groundedRate: CHAT_OBSERVABILITY_DASHBOARD.EMPTY_VALUE,
        cacheHitRate: CHAT_OBSERVABILITY_DASHBOARD.EMPTY_VALUE,
      },
      timeSeries: [],
      dateRange,
    }
  }

  const databasePool = await getChatRagDatabasePool()
  await ensureChatObservabilityDatabaseInitialized(databasePool)

  return selectChatObservabilityDashboard({
    databaseClient: databasePool,
    dateRange,
  })
}
