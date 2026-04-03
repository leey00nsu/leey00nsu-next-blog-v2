import { describe, expect, it } from 'vitest'
import { consumeDailyUsage, formatKstDateKey } from './daily-chat-usage'

describe('daily chat usage', () => {
  it('KST 기준 날짜 키를 만든다', () => {
    const result = formatKstDateKey(new Date('2026-04-02T15:30:00.000Z'))

    expect(result).toBe('2026-04-03')
  })

  it('같은 KST 날짜에서는 제한 수만큼만 허용한다', () => {
    const usageMap = new Map<string, number>()
    const now = new Date('2026-04-03T01:00:00.000Z')

    const allowedResults = Array.from({ length: 3 }, () => {
      return consumeDailyUsage({
        usageMap,
        now,
        maximumDailyRequests: 3,
      })
    })

    expect(allowedResults.map((result) => result.allowed)).toEqual([
      true,
      true,
      true,
    ])

    const rejectedResult = consumeDailyUsage({
      usageMap,
      now,
      maximumDailyRequests: 3,
    })

    expect(rejectedResult.allowed).toBe(false)
    expect(rejectedResult.currentCount).toBe(3)
  })

  it('KST 날짜가 바뀌면 카운터를 초기화한다', () => {
    const usageMap = new Map<string, number>()

    consumeDailyUsage({
      usageMap,
      now: new Date('2026-04-02T14:59:00.000Z'),
      maximumDailyRequests: 1,
    })

    const result = consumeDailyUsage({
      usageMap,
      now: new Date('2026-04-02T15:01:00.000Z'),
      maximumDailyRequests: 1,
    })

    expect(result.allowed).toBe(true)
    expect(result.currentCount).toBe(1)
    expect([...usageMap.keys()]).toEqual(['2026-04-03'])
  })
})
