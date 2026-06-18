import { normalizeChatConcepts } from '@/features/chat/lib/chat-required-concepts'
import type { NormalizedChatIntent } from '@/features/chat/model/chat-intent'
import type { SupportedLocale } from '@/shared/config/constants'

interface BuildChatIntentCacheKeyParams {
  locale: SupportedLocale
  intent: NormalizedChatIntent
  currentPostSlug?: string
  evidenceVersion: string
}

function normalizeCachePart(value: string): string {
  return value.trim().toLowerCase()
}

export function buildChatIntentCacheKey({
  locale,
  intent,
  currentPostSlug,
  evidenceVersion,
}: BuildChatIntentCacheKeyParams): string {
  const requestedFields = [...intent.requestedFields].sort().join(',')
  const requiredConcepts = normalizeChatConcepts({
    concepts: intent.requiredConcepts,
    locale,
  })
    .map((concept) => normalizeCachePart(concept))
    .sort()
    .join(',')
  const cacheParts = [
    locale,
    intent.target.kind,
    intent.target.sourceCategory ?? '',
    intent.target.slug ?? '',
    intent.target.title ?? '',
    intent.operation,
    intent.temporalConstraint.order,
    requestedFields,
    requiredConcepts,
    intent.evidenceScope,
    currentPostSlug ?? '',
    evidenceVersion,
  ]

  return cacheParts
    .map((cachePart) => encodeURIComponent(normalizeCachePart(cachePart)))
    .join(':')
}
