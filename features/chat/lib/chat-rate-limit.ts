const CHAT_RATE_LIMIT = {
  HEADERS: {
    CF_CONNECTING_IP: 'cf-connecting-ip',
    X_FORWARDED_FOR: 'x-forwarded-for',
    X_REAL_IP: 'x-real-ip',
  },
  UNKNOWN_CLIENT_KEY: 'unknown-client',
} as const

interface ConsumeChatRequestRateLimitParams {
  usageMap: Map<string, number[]>
  clientKey: string
  now?: number
  windowMilliseconds: number
  maximumRequestsPerWindow: number
}

export interface ChatRequestRateLimitResult {
  allowed: boolean
  currentCount: number
  resetAt: number
}

interface AcquireChatConcurrentRequestSlotParams {
  inFlightMap: Map<string, number>
  clientKey: string
  maximumConcurrentRequests: number
}

export interface ChatConcurrentRequestSlotResult {
  allowed: boolean
  currentCount: number
}

function buildNormalizedIpAddress(ipAddress: string | null): string | null {
  if (!ipAddress) {
    return null
  }

  const normalizedIpAddress = ipAddress
    .split(',')
    .map((segment) => segment.trim())
    .find(Boolean)

  return normalizedIpAddress ?? null
}

export function resolveChatClientKey(headers: Headers): string {
  return (
    buildNormalizedIpAddress(
      headers.get(CHAT_RATE_LIMIT.HEADERS.CF_CONNECTING_IP),
    ) ??
    buildNormalizedIpAddress(
      headers.get(CHAT_RATE_LIMIT.HEADERS.X_FORWARDED_FOR),
    ) ??
    buildNormalizedIpAddress(headers.get(CHAT_RATE_LIMIT.HEADERS.X_REAL_IP)) ??
    CHAT_RATE_LIMIT.UNKNOWN_CLIENT_KEY
  )
}

export function consumeChatRequestRateLimit({
  usageMap,
  clientKey,
  now = Date.now(),
  windowMilliseconds,
  maximumRequestsPerWindow,
}: ConsumeChatRequestRateLimitParams): ChatRequestRateLimitResult {
  const previousTimestamps = usageMap.get(clientKey) ?? []
  const activeTimestamps = previousTimestamps.filter((timestamp) => {
    return now - timestamp < windowMilliseconds
  })

  if (activeTimestamps.length >= maximumRequestsPerWindow) {
    usageMap.set(clientKey, activeTimestamps)

    return {
      allowed: false,
      currentCount: activeTimestamps.length,
      resetAt: activeTimestamps[0]! + windowMilliseconds,
    }
  }

  const nextTimestamps = [...activeTimestamps, now]
  usageMap.set(clientKey, nextTimestamps)

  return {
    allowed: true,
    currentCount: nextTimestamps.length,
    resetAt: now + windowMilliseconds,
  }
}

export function acquireChatConcurrentRequestSlot({
  inFlightMap,
  clientKey,
  maximumConcurrentRequests,
}: AcquireChatConcurrentRequestSlotParams): ChatConcurrentRequestSlotResult {
  const currentCount = inFlightMap.get(clientKey) ?? 0

  if (currentCount >= maximumConcurrentRequests) {
    return {
      allowed: false,
      currentCount,
    }
  }

  const nextCount = currentCount + 1
  inFlightMap.set(clientKey, nextCount)

  return {
    allowed: true,
    currentCount: nextCount,
  }
}

export function releaseChatConcurrentRequestSlot(params: {
  inFlightMap: Map<string, number>
  clientKey: string
}): void {
  const currentCount = params.inFlightMap.get(params.clientKey) ?? 0

  if (currentCount <= 1) {
    params.inFlightMap.delete(params.clientKey)
    return
  }

  params.inFlightMap.set(params.clientKey, currentCount - 1)
}
