export interface AnalyticsDateRange {
  startDate: string
  endDate: string
}

export interface AnalyticsDatabaseRange {
  startDate: string
  endDate: string
  startDateTime: string
  endDateTimeExclusive: string
  timeZone: string
}

export interface TimeSeriesChartPoint {
  date: string
  values: Record<string, number>
}

export interface TimeSeriesChartSeries {
  key: string
  label: string
  color: string
}
