'use client'

import { useTranslations } from 'next-intl'
import {
  ENGAGEMENT,
  type EngagementEventName,
} from '@/features/engagement/config/constants'
import type { EngagementDashboard } from '@/features/engagement/model/engagement-dashboard-types'
import type { EngagementEventSummary } from '@/features/engagement/model/engagement-events'
import { ANALYTICS } from '@/shared/config/analytics'
import type { SupportedLocale } from '@/shared/config/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { MetricCardGrid } from '@/shared/ui/metric-card-grid'
import { TimeSeriesChart } from '@/shared/ui/time-series-chart'

interface StudioEngagementOverviewProps {
  dashboard: EngagementDashboard
  summary: EngagementEventSummary
  locale: SupportedLocale
  selectedEventName?: EngagementEventName
}

export function StudioEngagementOverview({
  dashboard,
  summary,
  locale,
  selectedEventName,
}: StudioEngagementOverviewProps) {
  const translate = useTranslations('studio.events')
  const summaryItems = [
    {
      label: translate('summaryCards.totalEvents'),
      value: summary.totalEventCount,
    },
    {
      label: translate('summaryCards.uniqueVisitors'),
      value: summary.uniqueVisitorCount,
    },
    {
      label: translate('summaryCards.aboutViews'),
      value: summary.aboutViewCount,
    },
    {
      label: translate('summaryCards.blogListViews'),
      value: summary.blogListViewCount,
    },
    {
      label: translate('summaryCards.blogPostViews'),
      value: summary.blogPostViewCount,
    },
    {
      label: translate('summaryCards.resumeDownloads'),
      value: summary.resumeDownloadCount,
    },
    {
      label: translate('summaryCards.portfolioDownloads'),
      value: summary.portfolioDownloadCount,
    },
    {
      label: translate('summaryCards.contactClicks'),
      value: summary.contactClickCount,
    },
  ]
  const eventNames = selectedEventName
    ? [selectedEventName]
    : Object.values(ENGAGEMENT.EVENT_NAME)

  return (
    <section className="space-y-4" aria-labelledby="engagement-chart-title">
      <MetricCardGrid
        items={summaryItems.map((summaryItem) => ({
          label: summaryItem.label,
          value: summaryItem.value.toLocaleString(locale),
        }))}
      />

      <Card>
        <CardHeader>
          <CardTitle id="engagement-chart-title">
            {translate('chart.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TimeSeriesChart
            points={dashboard.timeSeries}
            series={eventNames.map((eventName, eventNameIndex) => ({
              key: eventName,
              label: translate(`eventNames.${eventName}`),
              color: ANALYTICS.CHART_COLORS[eventNameIndex],
            }))}
            locale={locale}
            accessibilityLabel={translate('chart.accessibilityLabel')}
            emptyLabel={translate('chart.empty')}
            variant="stacked-bar"
          />
        </CardContent>
      </Card>
    </section>
  )
}
