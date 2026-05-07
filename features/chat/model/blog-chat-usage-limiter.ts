import {
  acquireChatConcurrentRequestSlot,
  consumeChatRequestRateLimit,
  releaseChatConcurrentRequestSlot,
  resolveChatClientKey,
} from '@/features/chat/lib/chat-rate-limit'
import { consumeDailyUsage } from '@/features/chat/lib/daily-chat-usage'

const blogChatDailyUsageMap = new Map<string, number>()
const blogChatRateLimitUsageMap = new Map<string, number[]>()
const blogChatInFlightMap = new Map<string, number>()

export function resolveBlogChatClientKey(requestHeaders: Headers): string {
  return resolveChatClientKey(requestHeaders)
}

export function consumeBlogChatRequestRateLimit(params: {
  clientKey: string
  windowMilliseconds: number
  maximumRequestsPerWindow: number
}): ReturnType<typeof consumeChatRequestRateLimit> {
  return consumeChatRequestRateLimit({
    usageMap: blogChatRateLimitUsageMap,
    clientKey: params.clientKey,
    windowMilliseconds: params.windowMilliseconds,
    maximumRequestsPerWindow: params.maximumRequestsPerWindow,
  })
}

export function acquireBlogChatConcurrentRequestSlot(params: {
  clientKey: string
  maximumConcurrentRequests: number
}): ReturnType<typeof acquireChatConcurrentRequestSlot> {
  return acquireChatConcurrentRequestSlot({
    inFlightMap: blogChatInFlightMap,
    clientKey: params.clientKey,
    maximumConcurrentRequests: params.maximumConcurrentRequests,
  })
}

export function releaseBlogChatConcurrentRequestSlot(params: {
  clientKey: string
}): void {
  releaseChatConcurrentRequestSlot({
    inFlightMap: blogChatInFlightMap,
    clientKey: params.clientKey,
  })
}

export function consumeBlogChatDailyUsage(params: {
  maximumDailyRequests: number
}): ReturnType<typeof consumeDailyUsage> {
  return consumeDailyUsage({
    usageMap: blogChatDailyUsageMap,
    maximumDailyRequests: params.maximumDailyRequests,
  })
}
