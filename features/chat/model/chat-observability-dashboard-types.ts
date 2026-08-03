import type {
  AnalyticsDateRange,
  TimeSeriesChartPoint,
} from '@/shared/model/analytics'

export interface ChatObservabilityDashboardSummary {
  totalRequestCount: number
  averageDurationMilliseconds: number
  groundedRate: number
  cacheHitRate: number
}

export interface ChatObservabilityDashboard {
  summary: ChatObservabilityDashboardSummary
  timeSeries: TimeSeriesChartPoint[]
  dateRange: AnalyticsDateRange
}
