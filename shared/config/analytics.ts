export const ANALYTICS = {
  DEFAULT_DATE_RANGE_DAY_COUNT: 30,
  TIME_ZONE: 'Asia/Seoul',
  TIME_ZONE_OFFSET: '+09:00',
  DATE_INPUT_PATTERN: /^\d{4}-\d{2}-\d{2}$/u,
  FIRST_DAY_OFFSET: 1,
  DAYS_IN_WEEK: 7,
  MONDAY_DAY_INDEX: 1,
  DATE_DAY_START_INDEX: 8,
  CHART_COLORS: [
    'var(--analytics-chart-1)',
    'var(--analytics-chart-2)',
    'var(--analytics-chart-3)',
    'var(--analytics-chart-4)',
    'var(--analytics-chart-5)',
    'var(--analytics-chart-6)',
    'var(--analytics-chart-7)',
  ],
} as const
