import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StudioDateRangeFilter } from '@/features/studio-analytics/ui/studio-date-range-filter'

const routerPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush }),
}))

describe('StudioDateRangeFilter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-03T15:30:00.000Z'))
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('shadcn 캘린더 트리거와 퀵 범위를 제공한다', () => {
    renderDateRangeFilter()

    expect(screen.getByRole('button', { name: /시작일/ })).toHaveTextContent(
      '2026. 07. 01.',
    )
    expect(screen.getByRole('button', { name: /종료일/ })).toHaveTextContent(
      '2026. 07. 31.',
    )
    expect(screen.getByRole('button', { name: '7D' })).toHaveAttribute(
      'title',
      '오늘 포함 최근 7일',
    )
    expect(screen.getByRole('button', { name: '1W' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1M' })).toBeInTheDocument()
  })

  it('퀵 범위를 선택하면 보존 파라미터와 새 날짜로 즉시 이동한다', () => {
    renderDateRangeFilter()

    fireEvent.click(screen.getByRole('button', { name: '7D' }))

    expect(routerPush).toHaveBeenCalledWith(
      '/ko/studio/logs?pageSize=20&sortDirection=created_at_desc&page=1&startDate=2026-07-29&endDate=2026-08-04',
      { scroll: false },
    )
  })
})

function renderDateRangeFilter() {
  render(
    <StudioDateRangeFilter
      action="/ko/studio/logs"
      dateRange={{
        startDate: '2026-07-01',
        endDate: '2026-07-31',
      }}
      locale="ko"
      labels={{
        startDate: '시작일',
        endDate: '종료일',
        description: '조회할 날짜 범위를 선택하세요.',
        quickRanges: '빠른 날짜 범위',
        lastSevenDays: '오늘 포함 최근 7일',
        currentWeek: '이번 주',
        currentMonth: '이번 달',
      }}
      preservedSearchParameters={{
        pageSize: '20',
        sortDirection: 'created_at_desc',
      }}
    />,
  )
}
