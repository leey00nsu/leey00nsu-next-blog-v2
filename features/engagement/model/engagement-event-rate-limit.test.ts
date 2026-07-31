import { describe, expect, it } from 'vitest'
import {
  consumeEngagementEventRateLimit,
  resolveEngagementEventClientAddress,
} from '@/features/engagement/model/engagement-event-rate-limit'

const RATE_LIMIT_TEST = {
  WINDOW_MILLISECONDS: 60_000,
  MAXIMUM_REQUESTS_PER_WINDOW: 2,
  MAXIMUM_TRACKED_CLIENT_COUNT: 2,
  NOW: 1000,
} as const

describe('engagement-event-rate-limit', () => {
  it('Cloudflare 연결 주소를 우선해 클라이언트 주소를 구한다', () => {
    const headers = new Headers({
      'cf-connecting-ip': '198.51.100.1',
      'x-forwarded-for': '203.0.113.10, 203.0.113.11',
      'x-real-ip': '192.0.2.7',
    })

    expect(resolveEngagementEventClientAddress(headers)).toBe('198.51.100.1')
  })

  it('같은 기간에는 설정한 최대 요청 수까지만 허용한다', () => {
    const usageMap = new Map<string, number[]>()
    const baseParameters = {
      usageMap,
      clientKey: 'client-key',
      windowMilliseconds: RATE_LIMIT_TEST.WINDOW_MILLISECONDS,
      maximumRequestsPerWindow: RATE_LIMIT_TEST.MAXIMUM_REQUESTS_PER_WINDOW,
      maximumTrackedClientCount: RATE_LIMIT_TEST.MAXIMUM_TRACKED_CLIENT_COUNT,
    }

    expect(
      consumeEngagementEventRateLimit({
        ...baseParameters,
        now: RATE_LIMIT_TEST.NOW,
      }).allowed,
    ).toBe(true)
    expect(
      consumeEngagementEventRateLimit({
        ...baseParameters,
        now: RATE_LIMIT_TEST.NOW + 1,
      }).allowed,
    ).toBe(true)
    expect(
      consumeEngagementEventRateLimit({
        ...baseParameters,
        now: RATE_LIMIT_TEST.NOW + 2,
      }).allowed,
    ).toBe(false)
  })

  it('추적 가능한 클라이언트 수를 넘으면 새 키를 거부한다', () => {
    const usageMap = new Map<string, number[]>([
      ['first-client', [RATE_LIMIT_TEST.NOW]],
      ['second-client', [RATE_LIMIT_TEST.NOW]],
    ])

    const result = consumeEngagementEventRateLimit({
      usageMap,
      clientKey: 'third-client',
      now: RATE_LIMIT_TEST.NOW,
      windowMilliseconds: RATE_LIMIT_TEST.WINDOW_MILLISECONDS,
      maximumRequestsPerWindow: RATE_LIMIT_TEST.MAXIMUM_REQUESTS_PER_WINDOW,
      maximumTrackedClientCount: RATE_LIMIT_TEST.MAXIMUM_TRACKED_CLIENT_COUNT,
    })

    expect(result.allowed).toBe(false)
    expect(usageMap.size).toBe(RATE_LIMIT_TEST.MAXIMUM_TRACKED_CLIENT_COUNT)
  })
})
