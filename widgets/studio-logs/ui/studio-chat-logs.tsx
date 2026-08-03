import { getTranslations } from 'next-intl/server'
import { getChatObservabilityLogPage } from '@/features/chat/model/chat-observability'
import { getChatObservabilityDashboard } from '@/features/chat/api/get-chat-observability-dashboard'
import { StudioChatLogTable } from '@/widgets/studio-logs/ui/studio-chat-log-table'
import { StudioChatLogOverview } from '@/widgets/studio-logs/ui/studio-chat-log-overview'
import { StudioDateRangeFilter } from '@/features/studio-analytics/ui/studio-date-range-filter'
import {
  ROUTES,
  SupportedLocale,
  buildLocalizedRoutePath,
} from '@/shared/config/constants'
import type { AnalyticsDateRange } from '@/shared/model/analytics'

const STUDIO_CHAT_LOGS = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  EMPTY_TOTAL_COUNT: 0,
} as const

interface StudioChatLogsProps {
  locale: SupportedLocale
  page?: number
  pageSize?: number
  sortDirection?: string
  dateRange: AnalyticsDateRange
}

async function getStudioChatLogPageState(params: {
  page: number
  pageSize: number
  sortDirection?: string
  dateRange: AnalyticsDateRange
}) {
  try {
    const [logPage, dashboard] = await Promise.all([
      getChatObservabilityLogPage(params),
      getChatObservabilityDashboard(params.dateRange),
    ])

    return {
      logPage,
      dashboard,
      isDatabaseUnavailable: false,
    }
  } catch {
    return {
      logPage: {
        records: [],
        totalCount: STUDIO_CHAT_LOGS.EMPTY_TOTAL_COUNT,
        page: params.page,
        pageSize: params.pageSize,
        sortDirection: 'created_at_desc' as const,
        dateRange: params.dateRange,
      },
      dashboard: {
        summary: {
          totalRequestCount: STUDIO_CHAT_LOGS.EMPTY_TOTAL_COUNT,
          averageDurationMilliseconds: STUDIO_CHAT_LOGS.EMPTY_TOTAL_COUNT,
          groundedRate: STUDIO_CHAT_LOGS.EMPTY_TOTAL_COUNT,
          cacheHitRate: STUDIO_CHAT_LOGS.EMPTY_TOTAL_COUNT,
        },
        timeSeries: [],
        dateRange: params.dateRange,
      },
      isDatabaseUnavailable: true,
    }
  }
}

export async function StudioChatLogs({
  locale,
  page = STUDIO_CHAT_LOGS.DEFAULT_PAGE,
  pageSize = STUDIO_CHAT_LOGS.DEFAULT_PAGE_SIZE,
  sortDirection,
  dateRange,
}: StudioChatLogsProps) {
  const t = await getTranslations('studio.logs')
  const { logPage, dashboard, isDatabaseUnavailable } =
    await getStudioChatLogPageState({
      page,
      pageSize,
      sortDirection,
      dateRange,
    })

  return (
    <main className="w-full min-w-0 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-normal">
            {t('title')}
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            {t('description')}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <StudioDateRangeFilter
          action={buildLocalizedRoutePath(ROUTES.STUDIO_LOGS, locale)}
          dateRange={dateRange}
          locale={locale}
          labels={{
            startDate: t('dateRange.startDate'),
            endDate: t('dateRange.endDate'),
            description: t('dateRange.description'),
            quickRanges: t('dateRange.quickRanges'),
            lastSevenDays: t('dateRange.lastSevenDays'),
            currentWeek: t('dateRange.currentWeek'),
            currentMonth: t('dateRange.currentMonth'),
          }}
          preservedSearchParameters={{
            pageSize: String(logPage.pageSize),
            sortDirection: logPage.sortDirection,
          }}
        />
        <StudioChatLogOverview dashboard={dashboard} locale={locale} />
        <StudioChatLogTable
          logPage={logPage}
          locale={locale}
          isDatabaseUnavailable={isDatabaseUnavailable}
        />
      </div>
    </main>
  )
}
