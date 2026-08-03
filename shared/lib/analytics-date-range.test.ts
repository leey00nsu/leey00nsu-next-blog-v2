import { describe, expect, it } from 'vitest'
import {
  getAnalyticsQuickDateRange,
  getDefaultAnalyticsDateRange,
  normalizeAnalyticsDateRange,
  toAnalyticsDatabaseRange,
} from '@/shared/lib/analytics-date-range'

describe('analytics-date-range', () => {
  it('서울 시간 기준 최근 30일 범위를 생성한다', () => {
    expect(
      getDefaultAnalyticsDateRange(new Date('2026-08-03T15:30:00.000Z')),
    ).toEqual({
      startDate: '2026-07-06',
      endDate: '2026-08-04',
    })
  })

  it('유효한 검색 파라미터를 유지한다', () => {
    expect(
      normalizeAnalyticsDateRange({
        startDate: '2026-07-01',
        endDate: '2026-07-31',
      }),
    ).toEqual({
      startDate: '2026-07-01',
      endDate: '2026-07-31',
    })
  })

  it('잘못된 범위는 기본값으로 대체한다', () => {
    expect(
      normalizeAnalyticsDateRange({
        startDate: '2026-08-10',
        endDate: '2026-08-01',
        currentDate: new Date('2026-08-03T00:00:00.000Z'),
      }),
    ).toEqual({
      startDate: '2026-07-05',
      endDate: '2026-08-03',
    })
  })

  it('종료일 다음 날 자정을 배타적 상한으로 변환한다', () => {
    expect(
      toAnalyticsDatabaseRange({
        startDate: '2026-07-01',
        endDate: '2026-07-31',
      }),
    ).toEqual({
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      startDateTime: '2026-07-01T00:00:00+09:00',
      endDateTimeExclusive: '2026-08-01T00:00:00+09:00',
      timeZone: 'Asia/Seoul',
    })
  })

  it.each([
    ['last-seven-days', '2026-07-29', '2026-08-04'],
    ['current-week', '2026-08-03', '2026-08-04'],
    ['current-month', '2026-08-01', '2026-08-04'],
  ] as const)(
    '%s 퀵 범위를 서울 시간 기준으로 계산한다',
    (quickDateRange, startDate, endDate) => {
      expect(
        getAnalyticsQuickDateRange(
          quickDateRange,
          new Date('2026-08-03T15:30:00.000Z'),
        ),
      ).toEqual({ startDate, endDate })
    },
  )
})
