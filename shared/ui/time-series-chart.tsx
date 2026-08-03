'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type {
  TimeSeriesChartPoint,
  TimeSeriesChartSeries,
} from '@/shared/model/analytics'

const TIME_SERIES_CHART = {
  HEIGHT: 320,
  AXIS_WIDTH: 48,
  LINE_WIDTH: 2,
  DOT_RADIUS: 2,
  ACTIVE_DOT_RADIUS: 5,
  GRID_DASH: '3 3',
} as const

interface TimeSeriesChartProps {
  points: TimeSeriesChartPoint[]
  series: TimeSeriesChartSeries[]
  locale: string
  accessibilityLabel: string
  emptyLabel: string
  variant?: 'line' | 'stacked-bar'
}

function formatDateLabel(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00.000Z`))
}

export function TimeSeriesChart({
  points,
  series,
  locale,
  accessibilityLabel,
  emptyLabel,
  variant = 'line',
}: TimeSeriesChartProps) {
  if (points.length === 0) {
    return (
      <div className="text-muted-foreground flex h-80 items-center justify-center text-sm">
        {emptyLabel}
      </div>
    )
  }

  const chartData = points.map((point) => ({
    date: point.date,
    ...point.values,
  }))
  const commonChildren = (
    <>
      <CartesianGrid
        vertical={false}
        strokeDasharray={TIME_SERIES_CHART.GRID_DASH}
      />
      <XAxis
        dataKey="date"
        tickFormatter={(date: string) => formatDateLabel(date, locale)}
        tickLine={false}
        axisLine={false}
        minTickGap={24}
      />
      <YAxis
        width={TIME_SERIES_CHART.AXIS_WIDTH}
        allowDecimals={false}
        tickLine={false}
        axisLine={false}
      />
      <Tooltip
        labelFormatter={(date) => formatDateLabel(String(date), locale)}
        formatter={(value, name) => [
          Number(value).toLocaleString(locale),
          series.find((seriesItem) => seriesItem.key === name)?.label ?? name,
        ]}
        contentStyle={{
          borderRadius: 'var(--radius)',
          borderColor: 'var(--border)',
          backgroundColor: 'var(--popover)',
          color: 'var(--popover-foreground)',
        }}
      />
      <Legend
        formatter={(value) =>
          series.find((item) => item.key === value)?.label ?? value
        }
      />
    </>
  )

  return (
    <figure aria-label={accessibilityLabel}>
      <figcaption className="sr-only">{accessibilityLabel}</figcaption>
      <ResponsiveContainer width="100%" height={TIME_SERIES_CHART.HEIGHT}>
        {variant === 'stacked-bar' ? (
          <BarChart data={chartData} accessibilityLayer>
            {commonChildren}
            {series.map((seriesItem) => (
              <Bar
                key={seriesItem.key}
                dataKey={seriesItem.key}
                name={seriesItem.key}
                stackId="total"
                fill={seriesItem.color}
              />
            ))}
          </BarChart>
        ) : (
          <LineChart data={chartData} accessibilityLayer>
            {commonChildren}
            {series.map((seriesItem) => (
              <Line
                key={seriesItem.key}
                type="monotone"
                dataKey={seriesItem.key}
                name={seriesItem.key}
                stroke={seriesItem.color}
                strokeWidth={TIME_SERIES_CHART.LINE_WIDTH}
                dot={{ r: TIME_SERIES_CHART.DOT_RADIUS }}
                activeDot={{ r: TIME_SERIES_CHART.ACTIVE_DOT_RADIUS }}
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </figure>
  )
}
