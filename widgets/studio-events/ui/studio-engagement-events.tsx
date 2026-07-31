import { getTranslations } from 'next-intl/server'
import {
  getEngagementEventPage,
  type EngagementEventPage,
} from '@/features/engagement/model/engagement-events'
import { ENGAGEMENT } from '@/features/engagement/config/constants'
import { StudioEngagementEventTable } from '@/widgets/studio-events/ui/studio-engagement-event-table'
import type { SupportedLocale } from '@/shared/config/constants'

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
}

function buildEmptyEngagementEventPage(params: {
  page: number
  pageSize: number
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
  }
}

async function getStudioEngagementEventPageState(params: {
  page: number
  pageSize: number
  sortDirection?: string
  eventName?: string
}) {
  try {
    return {
      eventPage: await getEngagementEventPage(params),
      isDatabaseUnavailable: false,
    }
  } catch {
    return {
      eventPage: buildEmptyEngagementEventPage(params),
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
}: StudioEngagementEventsProps) {
  const translate = await getTranslations('studio.events')
  const { eventPage, isDatabaseUnavailable } =
    await getStudioEngagementEventPageState({
      page,
      pageSize,
      sortDirection,
      eventName,
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

      <StudioEngagementEventTable
        eventPage={eventPage}
        locale={locale}
        isDatabaseUnavailable={isDatabaseUnavailable}
      />
    </main>
  )
}
