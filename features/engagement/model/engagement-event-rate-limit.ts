const ENGAGEMENT_EVENT_CLIENT_ADDRESS = {
  HEADER: {
    CLOUDFLARE_CONNECTING_ADDRESS: 'cf-connecting-ip',
    FORWARDED_ADDRESS: 'x-forwarded-for',
    REAL_ADDRESS: 'x-real-ip',
  },
  UNKNOWN_ADDRESS: 'unknown-client',
} as const

interface ConsumeEngagementEventRateLimitParams {
  usageMap: Map<string, number[]>
  clientKey: string
  windowMilliseconds: number
  maximumRequestsPerWindow: number
  maximumTrackedClientCount: number
  now?: number
}

export interface EngagementEventRateLimitResult {
  allowed: boolean
  resetAt: number
}

function normalizeClientAddress(clientAddress: string | null): string | null {
  if (!clientAddress) {
    return null
  }

  return (
    clientAddress
      .split(',')
      .map((addressSegment) => addressSegment.trim())
      .find(Boolean) ?? null
  )
}

function collectActiveRequestTimestamps(params: {
  requestTimestamps: number[]
  now: number
  windowMilliseconds: number
}): number[] {
  return params.requestTimestamps.filter((requestTimestamp) => {
    return params.now - requestTimestamp < params.windowMilliseconds
  })
}

function pruneExpiredTrackedClients(params: {
  usageMap: Map<string, number[]>
  now: number
  windowMilliseconds: number
}): void {
  for (const [clientKey, requestTimestamps] of params.usageMap) {
    const activeRequestTimestamps = collectActiveRequestTimestamps({
      requestTimestamps,
      now: params.now,
      windowMilliseconds: params.windowMilliseconds,
    })

    if (activeRequestTimestamps.length === 0) {
      params.usageMap.delete(clientKey)
      continue
    }

    params.usageMap.set(clientKey, activeRequestTimestamps)
  }
}

export function resolveEngagementEventClientAddress(headers: Headers): string {
  return (
    normalizeClientAddress(
      headers.get(
        ENGAGEMENT_EVENT_CLIENT_ADDRESS.HEADER.CLOUDFLARE_CONNECTING_ADDRESS,
      ),
    ) ??
    normalizeClientAddress(
      headers.get(ENGAGEMENT_EVENT_CLIENT_ADDRESS.HEADER.FORWARDED_ADDRESS),
    ) ??
    normalizeClientAddress(
      headers.get(ENGAGEMENT_EVENT_CLIENT_ADDRESS.HEADER.REAL_ADDRESS),
    ) ??
    ENGAGEMENT_EVENT_CLIENT_ADDRESS.UNKNOWN_ADDRESS
  )
}

export function consumeEngagementEventRateLimit({
  usageMap,
  clientKey,
  windowMilliseconds,
  maximumRequestsPerWindow,
  maximumTrackedClientCount,
  now = Date.now(),
}: ConsumeEngagementEventRateLimitParams): EngagementEventRateLimitResult {
  if (usageMap.size >= maximumTrackedClientCount && !usageMap.has(clientKey)) {
    pruneExpiredTrackedClients({ usageMap, now, windowMilliseconds })

    if (usageMap.size >= maximumTrackedClientCount) {
      return {
        allowed: false,
        resetAt: now + windowMilliseconds,
      }
    }
  }

  const activeRequestTimestamps = collectActiveRequestTimestamps({
    requestTimestamps: usageMap.get(clientKey) ?? [],
    now,
    windowMilliseconds,
  })

  if (activeRequestTimestamps.length >= maximumRequestsPerWindow) {
    usageMap.set(clientKey, activeRequestTimestamps)

    return {
      allowed: false,
      resetAt: activeRequestTimestamps[0]! + windowMilliseconds,
    }
  }

  usageMap.set(clientKey, [...activeRequestTimestamps, now])

  return {
    allowed: true,
    resetAt: now + windowMilliseconds,
  }
}
