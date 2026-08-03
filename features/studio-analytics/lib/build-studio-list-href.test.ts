import { describe, expect, it } from 'vitest'
import { buildStudioListHref } from '@/features/studio-analytics/lib/build-studio-list-href'

describe('build-studio-list-href', () => {
  it('날짜 범위와 도메인 필터를 함께 보존한다', () => {
    expect(
      buildStudioListHref({
        routePath: '/studio/events',
        locale: 'ko',
        page: 2,
        pageSize: 20,
        sortDirection: 'created_at_desc',
        dateRange: {
          startDate: '2026-07-01',
          endDate: '2026-07-31',
        },
        additionalSearchParameters: {
          eventName: 'contact_click',
        },
      }),
    ).toBe(
      '/ko/studio/events?page=2&pageSize=20&sortDirection=created_at_desc&startDate=2026-07-01&endDate=2026-07-31&eventName=contact_click',
    )
  })
})
