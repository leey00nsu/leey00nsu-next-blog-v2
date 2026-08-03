import { describe, expect, it, vi } from 'vitest'
import type { Pool, PoolClient } from 'pg'
import { selectChatObservabilityDashboard } from '@/features/chat/api/get-chat-observability-dashboard'

describe('get-chat-observability-dashboard', () => {
  it('선택한 기간의 요약과 빈 날짜를 포함한 일별 요청 수를 반환한다', async () => {
    const queryMock = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            total_request_count: 3,
            average_duration_milliseconds: 125.5,
            grounded_rate: 66.666,
            cache_hit_rate: 33.333,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { date: '2026-07-01', request_count: 2 },
          { date: '2026-07-02', request_count: 0 },
          { date: '2026-07-03', request_count: 1 },
        ],
      })
    const databaseClient = {
      query: queryMock,
    } as unknown as Pool | PoolClient

    const result = await selectChatObservabilityDashboard({
      databaseClient,
      dateRange: {
        startDate: '2026-07-01',
        endDate: '2026-07-03',
      },
    })

    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('AVG(duration_milliseconds)'),
      ['2026-07-01T00:00:00+09:00', '2026-07-04T00:00:00+09:00', 100],
    )
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('generate_series'),
      [
        '2026-07-01',
        '2026-07-03',
        'Asia/Seoul',
        '2026-07-01T00:00:00+09:00',
        '2026-07-04T00:00:00+09:00',
      ],
    )
    expect(result).toEqual({
      summary: {
        totalRequestCount: 3,
        averageDurationMilliseconds: 125.5,
        groundedRate: 66.666,
        cacheHitRate: 33.333,
      },
      timeSeries: [
        { date: '2026-07-01', values: { requestCount: 2 } },
        { date: '2026-07-02', values: { requestCount: 0 } },
        { date: '2026-07-03', values: { requestCount: 1 } },
      ],
      dateRange: {
        startDate: '2026-07-01',
        endDate: '2026-07-03',
      },
    })
  })
})
