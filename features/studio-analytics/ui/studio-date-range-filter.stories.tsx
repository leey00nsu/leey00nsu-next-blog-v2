import type { Meta, StoryObj } from '@storybook/react'
import { StudioDateRangeFilter } from '@/features/studio-analytics/ui/studio-date-range-filter'

const meta = {
  title: 'features/studio-analytics/StudioDateRangeFilter',
  component: StudioDateRangeFilter,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/ko/studio/logs',
      },
    },
  },
  args: {
    action: '/ko/studio/logs',
    dateRange: {
      startDate: '2026-07-01',
      endDate: '2026-07-31',
    },
    locale: 'ko',
    labels: {
      startDate: '시작일',
      endDate: '종료일',
      description: '조회할 날짜 범위를 선택하세요.',
      quickRanges: '빠른 날짜 범위',
      lastSevenDays: '오늘 포함 최근 7일',
      currentWeek: '이번 주',
      currentMonth: '이번 달',
    },
    preservedSearchParameters: {
      pageSize: '20',
      sortDirection: 'created_at_desc',
    },
  },
} satisfies Meta<typeof StudioDateRangeFilter>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
