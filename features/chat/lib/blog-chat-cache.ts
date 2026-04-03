import type { BlogChatResponse } from '@/features/chat/model/chat-schema'

const NON_CACHEABLE_REFUSAL_REASONS: ReadonlySet<string> = new Set([
  'invalid_citations',
  'missing_api_key',
  'model_error',
  'daily_limit_exceeded',
  'question_too_long',
] as const)

export function shouldCacheBlogChatResponse(
  response: BlogChatResponse,
): boolean {
  if (response.grounded) {
    return true
  }

  if (!response.refusalReason) {
    return true
  }

  return !NON_CACHEABLE_REFUSAL_REASONS.has(response.refusalReason)
}
