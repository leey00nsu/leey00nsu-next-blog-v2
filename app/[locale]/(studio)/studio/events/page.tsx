import { StudioEngagementEvents } from '@/widgets/studio-events/ui/studio-engagement-events'
import type { SupportedLocale } from '@/shared/config/constants'
import { normalizeAnalyticsDateRange } from '@/shared/lib/analytics-date-range'

interface StudioEventsPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    page?: string
    pageSize?: string
    sortDirection?: string
    eventName?: string
    startDate?: string
    endDate?: string
  }>
}

const STUDIO_EVENTS_PAGE = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
} as const

function parseIntegerSearchParameter(
  value: string | undefined,
  fallbackValue: number,
): number {
  if (!value) {
    return fallbackValue
  }

  const parsedValue = Number.parseInt(value, 10)

  return Number.isNaN(parsedValue) ? fallbackValue : parsedValue
}

export const dynamic = 'force-dynamic'

export default async function StudioEventsPage({
  params,
  searchParams,
}: StudioEventsPageProps) {
  const { locale: localeParameter } = await params
  const { page, pageSize, sortDirection, eventName, startDate, endDate } =
    await searchParams
  const locale = localeParameter as SupportedLocale

  return (
    <StudioEngagementEvents
      locale={locale}
      page={parseIntegerSearchParameter(page, STUDIO_EVENTS_PAGE.DEFAULT_PAGE)}
      pageSize={parseIntegerSearchParameter(
        pageSize,
        STUDIO_EVENTS_PAGE.DEFAULT_PAGE_SIZE,
      )}
      sortDirection={sortDirection}
      eventName={eventName}
      dateRange={normalizeAnalyticsDateRange({ startDate, endDate })}
    />
  )
}
