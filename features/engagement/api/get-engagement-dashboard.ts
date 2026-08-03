import type { Pool, PoolClient } from 'pg'
import { z } from 'zod'
import {
  getEngagementDatabasePool,
  ensureEngagementDatabaseInitialized,
} from '@/features/engagement/model/engagement-events'
import type { EngagementDashboard } from '@/features/engagement/model/engagement-dashboard-types'
import {
  ENGAGEMENT,
  type EngagementEventName,
} from '@/features/engagement/config/constants'
import { toAnalyticsDatabaseRange } from '@/shared/lib/analytics-date-range'
import type { AnalyticsDateRange } from '@/shared/model/analytics'

const ENGAGEMENT_DASHBOARD = {
  TABLE: 'engagement_events',
  EMPTY_COUNT: 0,
} as const

const EngagementTimeSeriesRowSchema = z.object({
  date: z.coerce.string(),
  event_name: z.string(),
  event_count: z.coerce.number().int().nonnegative(),
})

function isEngagementEventName(value: string): value is EngagementEventName {
  return Object.values(ENGAGEMENT.EVENT_NAME).includes(
    value as EngagementEventName,
  )
}

export async function selectEngagementDashboard(params: {
  databaseClient: Pool | PoolClient
  dateRange: AnalyticsDateRange
}): Promise<EngagementDashboard> {
  const databaseRange = toAnalyticsDatabaseRange(params.dateRange)
  const eventNames = Object.values(ENGAGEMENT.EVENT_NAME)
  const timeSeriesResult = await params.databaseClient.query(
    `
      WITH daily_events AS (
        SELECT
          DATE(created_at AT TIME ZONE $4) AS date,
          event_name,
          COUNT(*)::int AS event_count
        FROM ${ENGAGEMENT_DASHBOARD.TABLE}
        WHERE created_at >= $5::timestamptz
          AND created_at < $6::timestamptz
        GROUP BY DATE(created_at AT TIME ZONE $4), event_name
      )
      SELECT
        generated_date::date::text AS date,
        event_names.event_name,
        COALESCE(daily_events.event_count, 0)::int AS event_count
      FROM generate_series(
        $1::date,
        $2::date,
        INTERVAL '1 day'
      ) AS generated_date
      CROSS JOIN unnest($3::text[]) AS event_names(event_name)
      LEFT JOIN daily_events
        ON daily_events.date = generated_date::date
        AND daily_events.event_name = event_names.event_name
      ORDER BY generated_date, event_names.event_name
    `,
    [
      databaseRange.startDate,
      databaseRange.endDate,
      eventNames,
      databaseRange.timeZone,
      databaseRange.startDateTime,
      databaseRange.endDateTimeExclusive,
    ],
  )
  const pointsByDate = new Map<
    string,
    { date: string; values: Record<string, number> }
  >()

  for (const rawRow of timeSeriesResult.rows) {
    const row = EngagementTimeSeriesRowSchema.parse(rawRow)

    if (!isEngagementEventName(row.event_name)) {
      continue
    }

    const point = pointsByDate.get(row.date) ?? {
      date: row.date,
      values: Object.fromEntries(
        eventNames.map((eventName) => [
          eventName,
          ENGAGEMENT_DASHBOARD.EMPTY_COUNT,
        ]),
      ),
    }
    point.values[row.event_name] = row.event_count
    pointsByDate.set(row.date, point)
  }

  return {
    timeSeries: [...pointsByDate.values()],
    dateRange: params.dateRange,
  }
}

export async function getEngagementDashboard(
  dateRange: AnalyticsDateRange,
): Promise<EngagementDashboard> {
  const databasePool = getEngagementDatabasePool()
  await ensureEngagementDatabaseInitialized(databasePool)

  return selectEngagementDashboard({
    databaseClient: databasePool,
    dateRange,
  })
}
