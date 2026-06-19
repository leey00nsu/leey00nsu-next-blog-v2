import { normalizeChatConcepts } from '@/features/chat/lib/chat-required-concepts'
import type { NormalizedChatIntent } from '@/features/chat/model/chat-intent'
import type { ChatRetrievalPlan } from '@/features/chat/model/chat-retrieval-plan'
import type { SupportedLocale } from '@/shared/config/constants'

interface BuildChatIntentCacheKeyParams {
  locale: SupportedLocale
  intent: NormalizedChatIntent
  currentPostSlug?: string
  evidenceVersion: string
}

interface BuildChatRetrievalPlanCacheKeyParams {
  locale: SupportedLocale
  retrievalPlan: ChatRetrievalPlan
  currentPostSlug?: string
  evidenceVersion: string
}

function normalizeCachePart(value: string): string {
  return value.trim().toLowerCase()
}

function normalizeCacheParts(values: string[]): string[] {
  return values
    .map((value) => normalizeCachePart(value))
    .sort()
}

export function buildChatRetrievalPlanCacheKey({
  locale,
  retrievalPlan,
  currentPostSlug,
  evidenceVersion,
}: BuildChatRetrievalPlanCacheKeyParams): string {
  const normalizedTargets = retrievalPlan.canonicalTargets
    .map((target) => {
      return [
        target.kind,
        target.sourceCategory ?? '',
        target.slug ?? '',
        target.title ?? '',
      ]
        .map((targetPart) => normalizeCachePart(targetPart))
        .join('/')
    })
    .sort()
  const cacheParts = [
    locale,
    retrievalPlan.executionKind,
    retrievalPlan.operation,
    normalizedTargets.join(','),
    retrievalPlan.sourceStrategy,
    normalizeCacheParts(retrievalPlan.sourceCategories).join(','),
    retrievalPlan.temporalStrategy,
    retrievalPlan.temporalOrder ?? '',
    normalizeCacheParts(retrievalPlan.requestedFields).join(','),
    normalizeChatConcepts({
      concepts: retrievalPlan.requiredConcepts,
      locale,
    })
      .map((concept) => normalizeCachePart(concept))
      .sort()
      .join(','),
    normalizeChatConcepts({
      concepts: retrievalPlan.optionalConcepts,
      locale,
    })
      .map((concept) => normalizeCachePart(concept))
      .sort()
      .join(','),
    String(retrievalPlan.maximumEvidenceCount),
    currentPostSlug ?? '',
    evidenceVersion,
  ]

  return cacheParts
    .map((cachePart) => encodeURIComponent(normalizeCachePart(cachePart)))
    .join(':')
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
