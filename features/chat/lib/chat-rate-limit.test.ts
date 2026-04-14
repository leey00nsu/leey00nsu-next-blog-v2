import { describe, expect, it } from 'vitest'
import {
  acquireChatConcurrentRequestSlot,
  consumeChatRequestRateLimit,
  releaseChatConcurrentRequestSlot,
  resolveChatClientKey,
} from './chat-rate-limit'

describe('chat rate limit', () => {
  it('cf-connecting-ip를 우선해 client key를 만든다', () => {
    const headers = new Headers({
      'cf-connecting-ip': '198.51.100.1',
      'x-forwarded-for': '203.0.113.10, 203.0.113.11',
      'x-real-ip': '192.0.2.7',
    })

    expect(resolveChatClientKey(headers)).toBe('198.51.100.1')
  })

  it('x-forwarded-for가 있으면 첫 번째 ip를 사용한다', () => {
    const headers = new Headers({
      'x-forwarded-for': '203.0.113.10, 203.0.113.11',
    })

    expect(resolveChatClientKey(headers)).toBe('203.0.113.10')
  })

  it('같은 window 안에서는 최대 요청 수까지만 허용한다', () => {
    const usageMap = new Map<string, number[]>()
    const now = 1000

    const allowedResults = Array.from({ length: 3 }, (_, index) => {
      return consumeChatRequestRateLimit({
        usageMap,
        clientKey: '203.0.113.10',
        now: now + index,
        windowMilliseconds: 60_000,
        maximumRequestsPerWindow: 3,
      })
    })

    expect(allowedResults.map((result) => result.allowed)).toEqual([
      true,
      true,
      true,
    ])

    const rejectedResult = consumeChatRequestRateLimit({
      usageMap,
      clientKey: '203.0.113.10',
      now: now + 4,
      windowMilliseconds: 60_000,
      maximumRequestsPerWindow: 3,
    })

    expect(rejectedResult.allowed).toBe(false)
    expect(rejectedResult.currentCount).toBe(3)
  })

  it('window가 지나면 이전 요청 기록을 버린다', () => {
    const usageMap = new Map<string, number[]>()

    consumeChatRequestRateLimit({
      usageMap,
      clientKey: '203.0.113.10',
      now: 1000,
      windowMilliseconds: 100,
      maximumRequestsPerWindow: 1,
    })

    const result = consumeChatRequestRateLimit({
      usageMap,
      clientKey: '203.0.113.10',
      now: 1101,
      windowMilliseconds: 100,
      maximumRequestsPerWindow: 1,
    })

    expect(result.allowed).toBe(true)
    expect(result.currentCount).toBe(1)
  })

  it('동시 요청 수는 제한까지만 slot을 할당한다', () => {
    const inFlightMap = new Map<string, number>()

    const allowedResult = acquireChatConcurrentRequestSlot({
      inFlightMap,
      clientKey: '203.0.113.10',
      maximumConcurrentRequests: 1,
    })
    const rejectedResult = acquireChatConcurrentRequestSlot({
      inFlightMap,
      clientKey: '203.0.113.10',
      maximumConcurrentRequests: 1,
    })

    expect(allowedResult).toEqual({
      allowed: true,
      currentCount: 1,
    })
    expect(rejectedResult).toEqual({
      allowed: false,
      currentCount: 1,
    })
  })

  it('slot을 해제하면 in-flight 카운터를 줄인다', () => {
    const inFlightMap = new Map<string, number>()

    acquireChatConcurrentRequestSlot({
      inFlightMap,
      clientKey: '203.0.113.10',
      maximumConcurrentRequests: 2,
    })
    acquireChatConcurrentRequestSlot({
      inFlightMap,
      clientKey: '203.0.113.10',
      maximumConcurrentRequests: 2,
    })

    releaseChatConcurrentRequestSlot({
      inFlightMap,
      clientKey: '203.0.113.10',
    })

    expect(inFlightMap.get('203.0.113.10')).toBe(1)
  })
})
