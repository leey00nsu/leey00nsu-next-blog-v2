import { describe, expect, it, vi } from 'vitest'
import type { Pool, PoolClient } from 'pg'
import { selectEngagementDashboard } from '@/features/engagement/api/get-engagement-dashboard'
import { ENGAGEMENT } from '@/features/engagement/config/constants'

describe('get-engagement-dashboard', () => {
  it('날짜별 이벤트 행을 누적 막대 차트 데이터로 변환한다', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      rows: [
        {
          date: '2026-07-01',
          event_name: ENGAGEMENT.EVENT_NAME.ABOUT_VIEW,
          event_count: 2,
        },
        {
          date: '2026-07-01',
          event_name: ENGAGEMENT.EVENT_NAME.CONTACT_CLICK,
          event_count: 1,
        },
        {
          date: '2026-07-02',
          event_name: ENGAGEMENT.EVENT_NAME.ABOUT_VIEW,
          event_count: 0,
        },
      ],
    })
    const databaseClient = {
      query: queryMock,
    } as unknown as Pool | PoolClient

    const result = await selectEngagementDashboard({
      databaseClient,
      dateRange: {
        startDate: '2026-07-01',
        endDate: '2026-07-02',
      },
    })

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('CROSS JOIN unnest'),
      [
        '2026-07-01',
        '2026-07-02',
        Object.values(ENGAGEMENT.EVENT_NAME),
        'Asia/Seoul',
        '2026-07-01T00:00:00+09:00',
        '2026-07-03T00:00:00+09:00',
      ],
    )
    expect(result.timeSeries).toEqual([
      {
        date: '2026-07-01',
        values: expect.objectContaining({
          [ENGAGEMENT.EVENT_NAME.ABOUT_VIEW]: 2,
          [ENGAGEMENT.EVENT_NAME.CONTACT_CLICK]: 1,
          [ENGAGEMENT.EVENT_NAME.RESUME_DOWNLOAD]: 0,
        }),
      },
      {
        date: '2026-07-02',
        values: expect.objectContaining({
          [ENGAGEMENT.EVENT_NAME.ABOUT_VIEW]: 0,
          [ENGAGEMENT.EVENT_NAME.CONTACT_CLICK]: 0,
        }),
      },
    ])
  })
})
