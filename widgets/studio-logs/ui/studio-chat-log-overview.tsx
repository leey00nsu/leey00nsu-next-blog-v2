'use client'

import { useTranslations } from 'next-intl'
import type { ChatObservabilityDashboard } from '@/features/chat/model/chat-observability-dashboard-types'
import { ANALYTICS } from '@/shared/config/analytics'
import type { SupportedLocale } from '@/shared/config/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { MetricCardGrid } from '@/shared/ui/metric-card-grid'
import { TimeSeriesChart } from '@/shared/ui/time-series-chart'

const STUDIO_CHAT_LOG_OVERVIEW = {
  REQUEST_COUNT_SERIES_KEY: 'requestCount',
  PERCENTAGE_DECIMAL_PLACES: 1,
} as const

interface StudioChatLogOverviewProps {
  dashboard: ChatObservabilityDashboard
  locale: SupportedLocale
}

export function StudioChatLogOverview({
  dashboard,
  locale,
}: StudioChatLogOverviewProps) {
  const translate = useTranslations('studio.logs')
  const summaryItems = [
    {
      label: translate('summaryCards.totalRequests'),
      value: dashboard.summary.totalRequestCount.toLocaleString(locale),
    },
    {
      label: translate('summaryCards.averageDuration'),
      value: translate('duration', {
        durationMilliseconds: Math.round(
          dashboard.summary.averageDurationMilliseconds,
        ),
      }),
    },
    {
      label: translate('summaryCards.groundedRate'),
      value: `${dashboard.summary.groundedRate.toFixed(
        STUDIO_CHAT_LOG_OVERVIEW.PERCENTAGE_DECIMAL_PLACES,
      )}%`,
    },
    {
      label: translate('summaryCards.cacheHitRate'),
      value: `${dashboard.summary.cacheHitRate.toFixed(
        STUDIO_CHAT_LOG_OVERVIEW.PERCENTAGE_DECIMAL_PLACES,
      )}%`,
    },
  ]

  return (
    <section className="space-y-4" aria-labelledby="chat-log-chart-title">
      <MetricCardGrid items={summaryItems} />

      <Card>
        <CardHeader>
          <CardTitle id="chat-log-chart-title">
            {translate('chart.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TimeSeriesChart
            points={dashboard.timeSeries}
            series={[
              {
                key: STUDIO_CHAT_LOG_OVERVIEW.REQUEST_COUNT_SERIES_KEY,
                label: translate('chart.requests'),
                color: ANALYTICS.CHART_COLORS[2],
              },
            ]}
            locale={locale}
            accessibilityLabel={translate('chart.accessibilityLabel')}
            emptyLabel={translate('chart.empty')}
          />
        </CardContent>
      </Card>
    </section>
  )
}
