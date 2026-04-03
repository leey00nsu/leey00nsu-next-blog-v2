interface ConsumeDailyUsageParams {
  usageMap: Map<string, number>
  now?: Date
  maximumDailyRequests: number
}

export interface DailyUsageResult {
  allowed: boolean
  currentCount: number
  dateKey: string
}

const KST_TIME_ZONE = 'Asia/Seoul'

export function formatKstDateKey(now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: KST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  return formatter.format(now)
}

export function consumeDailyUsage({
  usageMap,
  now = new Date(),
  maximumDailyRequests,
}: ConsumeDailyUsageParams): DailyUsageResult {
  const dateKey = formatKstDateKey(now)

  for (const usageDateKey of usageMap.keys()) {
    if (usageDateKey !== dateKey) {
      usageMap.delete(usageDateKey)
    }
  }

  const currentCount = usageMap.get(dateKey) ?? 0

  if (currentCount >= maximumDailyRequests) {
    return {
      allowed: false,
      currentCount,
      dateKey,
    }
  }

  const nextCount = currentCount + 1
  usageMap.set(dateKey, nextCount)

  return {
    allowed: true,
    currentCount: nextCount,
    dateKey,
  }
}
