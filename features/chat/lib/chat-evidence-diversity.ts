import { BLOG_CHAT } from '@/features/chat/config/constants'
import type { ChatRetrievalPlan } from '@/features/chat/model/chat-retrieval-plan'

interface ChatEvidenceGroupCandidate {
  slug: string
  url: string
}

export interface ChatEvidenceDiversityPolicy {
  resolveGroupKey: (candidate: ChatEvidenceGroupCandidate) => string
  maximumMatchesPerGroup: number
}

const AGGREGATE_CHAT_OPERATIONS = new Set<ChatRetrievalPlan['operation']>([
  'compare',
  'recommend',
  'summarize',
])

export const DEFAULT_CHAT_EVIDENCE_DIVERSITY_POLICY: ChatEvidenceDiversityPolicy =
  {
    resolveGroupKey: (candidate) => candidate.slug,
    maximumMatchesPerGroup: BLOG_CHAT.SEARCH.MAXIMUM_MATCHES_PER_SLUG,
  }

export function isAggregateChatRetrievalPlan(plan: ChatRetrievalPlan): boolean {
  return AGGREGATE_CHAT_OPERATIONS.has(plan.operation)
}

/**
 * 계획이 단일 문서로 고정됐는지 판단한다.
 *
 * sourceStrategy가 only이거나 현재 페이지를 대상으로 하면 evidence 필터가 이미 그 문서의 근거만
 * 남긴다. 이때의 slug당 상한은 문서 간 다양성을 지키는 장치라 아무것도 지키지 못한 채 그 문서의
 * 3순위 근거를 잘라낸다.
 */
export function isDocumentScopedRetrievalPlan(
  plan: ChatRetrievalPlan,
): boolean {
  const hasStrictTargetScope =
    plan.sourceStrategy === 'only' ||
    plan.canonicalTargets.some((target) => {
      return target.kind === 'current_source'
    })

  return hasStrictTargetScope && plan.canonicalTargets.length === 1
}

export function resolveChatEvidenceDiversityPolicy(params: {
  plan: ChatRetrievalPlan
  maximumMatchesPerSlug: number
}): ChatEvidenceDiversityPolicy {
  if (isDocumentScopedRetrievalPlan(params.plan)) {
    // 문서가 하나로 고정됐다면 섹션(url) 단위로만 중복을 막고, 그 문서의 다른 섹션도 근거로 쓴다.
    return {
      resolveGroupKey: (candidate) => candidate.url,
      maximumMatchesPerGroup: params.maximumMatchesPerSlug,
    }
  }

  if (
    params.plan.operation === 'compare' ||
    params.plan.operation === 'summarize'
  ) {
    return {
      resolveGroupKey: (candidate) => candidate.url,
      maximumMatchesPerGroup: params.maximumMatchesPerSlug,
    }
  }

  return {
    resolveGroupKey: (candidate) => candidate.slug,
    maximumMatchesPerGroup: params.maximumMatchesPerSlug,
  }
}
