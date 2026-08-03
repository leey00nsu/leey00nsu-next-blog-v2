import type { Meta, StoryObj } from '@storybook/react'
import { MetricCardGrid } from '@/shared/ui/metric-card-grid'

const meta = {
  title: 'shared/MetricCardGrid',
  component: MetricCardGrid,
  args: {
    items: [
      { label: '전체 요청', value: '1,248' },
      { label: '평균 처리 시간', value: '842ms' },
      { label: 'Grounded 비율', value: '96.4%' },
      { label: '캐시 적중률', value: '31.8%' },
    ],
  },
} satisfies Meta<typeof MetricCardGrid>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
