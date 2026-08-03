import { getTranslations } from 'next-intl/server'
import {
  getEngagementEventPage,
  type EngagementEventPage,
} from '@/features/engagement/model/engagement-events'
import { getEngagementDashboard } from '@/features/engagement/api/get-engagement-dashboard'
import { ENGAGEMENT } from '@/features/engagement/config/constants'
import { StudioEngagementEventTable } from '@/widgets/studio-events/ui/studio-engagement-event-table'
import { StudioEngagementOverview } from '@/widgets/studio-events/ui/studio-engagement-overview'
import { StudioDateRangeFilter } from '@/features/studio-analytics/ui/studio-date-range-filter'
import {
  ROUTES,
  buildLocalizedRoutePath,
  type SupportedLocale,
} from '@/shared/config/constants'
import type { AnalyticsDateRange } from '@/shared/model/analytics'

const STUDIO_ENGAGEMENT_EVENTS = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  EMPTY_COUNT: 0,
} as const

interface StudioEngagementEventsProps {
  locale: SupportedLocale
  page?: number
  pageSize?: number
  sortDirection?: string
  eventName?: string
  dateRange: AnalyticsDateRange
}

function buildEmptyEngagementEventPage(params: {
  page: number
  pageSize: number
  dateRange: AnalyticsDateRange
}): EngagementEventPage {
  return {
    records: [],
    summary: {
      totalEventCount: STUDIO_ENGAGEMENT_EVENTS.EMPTY_COUNT,
      uniqueVisitorCount: STUDIO_ENGAGEMENT_EVENTS.EMPTY_COUNT,
      aboutViewCount: STUDIO_ENGAGEMENT_EVENTS.EMPTY_COUNT,
      blogListViewCount: STUDIO_ENGAGEMENT_EVENTS.EMPTY_COUNT,
      blogPostViewCount: STUDIO_ENGAGEMENT_EVENTS.EMPTY_COUNT,
      resumeDownloadCount: STUDIO_ENGAGEMENT_EVENTS.EMPTY_COUNT,
      portfolioDownloadCount: STUDIO_ENGAGEMENT_EVENTS.EMPTY_COUNT,
      contactClickCount: STUDIO_ENGAGEMENT_EVENTS.EMPTY_COUNT,
    },
    totalCount: STUDIO_ENGAGEMENT_EVENTS.EMPTY_COUNT,
    page: params.page,
    pageSize: params.pageSize,
    sortDirection: ENGAGEMENT.SORT_DIRECTION.CREATED_AT_DESCENDING,
    dateRange: params.dateRange,
  }
}

async function getStudioEngagementEventPageState(params: {
  page: number
  pageSize: number
  sortDirection?: string
  eventName?: string
  dateRange: AnalyticsDateRange
}) {
  try {
    const [eventPage, dashboard] = await Promise.all([
      getEngagementEventPage(params),
      getEngagementDashboard(params.dateRange),
    ])

    return {
      eventPage,
      dashboard,
      isDatabaseUnavailable: false,
    }
  } catch {
    return {
      eventPage: buildEmptyEngagementEventPage(params),
      dashboard: {
        timeSeries: [],
        dateRange: params.dateRange,
      },
      isDatabaseUnavailable: true,
    }
  }
}

export async function StudioEngagementEvents({
  locale,
  page = STUDIO_ENGAGEMENT_EVENTS.DEFAULT_PAGE,
  pageSize = STUDIO_ENGAGEMENT_EVENTS.DEFAULT_PAGE_SIZE,
  sortDirection,
  eventName,
  dateRange,
}: StudioEngagementEventsProps) {
  const translate = await getTranslations('studio.events')
  const { eventPage, dashboard, isDatabaseUnavailable } =
    await getStudioEngagementEventPageState({
      page,
      pageSize,
      sortDirection,
      eventName,
      dateRange,
    })

  return (
    <main className="w-full min-w-0 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 space-y-3">
        <h1 className="text-3xl font-semibold tracking-normal">
          {translate('title')}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          {translate('description')}
        </p>
      </div>

      <div className="space-y-6">
        <StudioDateRangeFilter
          action={buildLocalizedRoutePath(ROUTES.STUDIO_EVENTS, locale)}
          dateRange={dateRange}
          locale={locale}
          labels={{
            startDate: translate('dateRange.startDate'),
            endDate: translate('dateRange.endDate'),
            description: translate('dateRange.description'),
            quickRanges: translate('dateRange.quickRanges'),
            lastSevenDays: translate('dateRange.lastSevenDays'),
            currentWeek: translate('dateRange.currentWeek'),
            currentMonth: translate('dateRange.currentMonth'),
          }}
          preservedSearchParameters={{
            pageSize: String(eventPage.pageSize),
            sortDirection: eventPage.sortDirection,
            eventName: eventPage.eventName,
          }}
        />
        <StudioEngagementOverview
          dashboard={dashboard}
          summary={eventPage.summary}
          locale={locale}
          selectedEventName={eventPage.eventName}
        />
        <StudioEngagementEventTable
          eventPage={eventPage}
          locale={locale}
          isDatabaseUnavailable={isDatabaseUnavailable}
        />
      </div>
    </main>
  )
}
