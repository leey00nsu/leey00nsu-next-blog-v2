import { ANALYTICS } from '@/shared/config/analytics'
import type {
  AnalyticsDatabaseRange,
  AnalyticsDateRange,
} from '@/shared/model/analytics'

function formatDateInTimeZone(date: Date, timeZone: string): string {
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const datePartMap = new Map(
    dateParts.map((datePart) => [datePart.type, datePart.value]),
  )

  return `${datePartMap.get('year')}-${datePartMap.get('month')}-${datePartMap.get('day')}`
}

function shiftDate(dateValue: string, dayOffset: number): string {
  const date = new Date(`${dateValue}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + dayOffset)

  return date.toISOString().slice(0, 'YYYY-MM-DD'.length)
}

export type AnalyticsQuickDateRange =
  | 'last-seven-days'
  | 'current-week'
  | 'current-month'

export function getAnalyticsQuickDateRange(
  quickDateRange: AnalyticsQuickDateRange,
  currentDate = new Date(),
): AnalyticsDateRange {
  const endDate = formatDateInTimeZone(currentDate, ANALYTICS.TIME_ZONE)

  if (quickDateRange === 'current-month') {
    return {
      startDate: `${endDate.slice(0, ANALYTICS.DATE_DAY_START_INDEX)}01`,
      endDate,
    }
  }

  if (quickDateRange === 'current-week') {
    const currentDayIndex = new Date(`${endDate}T00:00:00.000Z`).getUTCDay()
    const daysSinceMonday =
      (currentDayIndex - ANALYTICS.MONDAY_DAY_INDEX + ANALYTICS.DAYS_IN_WEEK) %
      ANALYTICS.DAYS_IN_WEEK

    return {
      startDate: shiftDate(endDate, -daysSinceMonday),
      endDate,
    }
  }

  return {
    startDate: shiftDate(
      endDate,
      -(ANALYTICS.DAYS_IN_WEEK - ANALYTICS.FIRST_DAY_OFFSET),
    ),
    endDate,
  }
}

function isValidDateInput(value: string | undefined): value is string {
  if (!value || !ANALYTICS.DATE_INPUT_PATTERN.test(value)) {
    return false
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`)

  return !Number.isNaN(parsedDate.getTime()) && shiftDate(value, 0) === value
}

export function getDefaultAnalyticsDateRange(
  currentDate = new Date(),
): AnalyticsDateRange {
  const endDate = formatDateInTimeZone(currentDate, ANALYTICS.TIME_ZONE)
  const startDate = shiftDate(
    endDate,
    -(ANALYTICS.DEFAULT_DATE_RANGE_DAY_COUNT - ANALYTICS.FIRST_DAY_OFFSET),
  )

  return { startDate, endDate }
}

export function normalizeAnalyticsDateRange(params: {
  startDate?: string
  endDate?: string
  currentDate?: Date
}): AnalyticsDateRange {
  const defaultDateRange = getDefaultAnalyticsDateRange(params.currentDate)

  if (
    !isValidDateInput(params.startDate) ||
    !isValidDateInput(params.endDate) ||
    params.startDate > params.endDate
  ) {
    return defaultDateRange
  }

  return {
    startDate: params.startDate,
    endDate: params.endDate,
  }
}

export function toAnalyticsDatabaseRange(
  dateRange: AnalyticsDateRange,
): AnalyticsDatabaseRange {
  const endDateExclusive = shiftDate(
    dateRange.endDate,
    ANALYTICS.FIRST_DAY_OFFSET,
  )

  return {
    ...dateRange,
    startDateTime: `${dateRange.startDate}T00:00:00${ANALYTICS.TIME_ZONE_OFFSET}`,
    endDateTimeExclusive: `${endDateExclusive}T00:00:00${ANALYTICS.TIME_ZONE_OFFSET}`,
    timeZone: ANALYTICS.TIME_ZONE,
  }
}
