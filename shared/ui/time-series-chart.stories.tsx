import type { Meta, StoryObj } from '@storybook/react'
import { ANALYTICS } from '@/shared/config/analytics'
import { TimeSeriesChart } from '@/shared/ui/time-series-chart'

const meta = {
  title: 'shared/TimeSeriesChart',
  component: TimeSeriesChart,
  args: {
    locale: 'ko',
    accessibilityLabel: '일별 요청 수 차트',
    emptyLabel: '표시할 데이터가 없습니다.',
    series: [
      {
        key: 'requestCount',
        label: '챗봇 요청',
        color: ANALYTICS.CHART_COLORS[2],
      },
    ],
    points: [
      { date: '2026-07-01', values: { requestCount: 4 } },
      { date: '2026-07-02', values: { requestCount: 7 } },
      { date: '2026-07-03', values: { requestCount: 3 } },
      { date: '2026-07-04', values: { requestCount: 9 } },
    ],
  },
} satisfies Meta<typeof TimeSeriesChart>

export default meta

type Story = StoryObj<typeof meta>

export const Line: Story = {}

export const StackedBar: Story = {
  args: {
    variant: 'stacked-bar',
    series: [
      {
        key: 'view',
        label: '페이지 조회',
        color: ANALYTICS.CHART_COLORS[0],
      },
      {
        key: 'conversion',
        label: '전환',
        color: ANALYTICS.CHART_COLORS[1],
      },
    ],
    points: [
      { date: '2026-07-01', values: { view: 8, conversion: 1 } },
      { date: '2026-07-02', values: { view: 12, conversion: 3 } },
      { date: '2026-07-03', values: { view: 5, conversion: 2 } },
    ],
  },
}

export const Empty: Story = {
  args: {
    points: [],
  },
}
