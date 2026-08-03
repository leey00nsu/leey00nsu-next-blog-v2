import type {
  AnalyticsDateRange,
  TimeSeriesChartPoint,
} from '@/shared/model/analytics'

export interface EngagementDashboard {
  timeSeries: TimeSeriesChartPoint[]
  dateRange: AnalyticsDateRange
}
