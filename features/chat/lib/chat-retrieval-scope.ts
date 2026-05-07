import type { ChatSourceCategory } from '@/features/chat/model/chat-evidence'
import type { ChatQuestionPlan } from '@/features/chat/model/chat-question-plan'

export interface ChatResolvedRetrievalScope {
  mode: 'none' | 'current_source' | 'entity' | 'corpus'
  sourceCategory: ChatSourceCategory | null
  slug: string | null
  title: string | null
}

export function resolveChatRetrievalScope(params: {
  questionPlan: ChatQuestionPlan
  currentPostSlug?: string
}): ChatResolvedRetrievalScope {
  if (
    params.questionPlan.route !== 'retrieve' ||
    params.questionPlan.retrievalScope === 'none'
  ) {
    return {
      mode: 'none',
      sourceCategory: null,
      slug: null,
      title: null,
    }
  }

  if (params.questionPlan.retrievalScope === 'corpus') {
    return {
      mode: 'corpus',
      sourceCategory: null,
      slug: null,
      title: null,
    }
  }

  const sourceCategory = params.questionPlan.referenceTarget.sourceCategory
  const fallbackCurrentSlug =
    params.questionPlan.retrievalScope === 'current_source' &&
    sourceCategory === 'blog'
      ? params.currentPostSlug ?? null
      : null
  const slug = params.questionPlan.referenceTarget.slug ?? fallbackCurrentSlug

  return {
    mode: params.questionPlan.retrievalScope,
    sourceCategory,
    slug,
    title: params.questionPlan.referenceTarget.title,
  }
}

export function resolveScopedCurrentSourceSlug(
  retrievalScope: ChatResolvedRetrievalScope,
): string | undefined {
  if (
    retrievalScope.mode !== 'current_source' ||
    retrievalScope.sourceCategory !== 'blog' ||
    !retrievalScope.slug
  ) {
    return undefined
  }

  return retrievalScope.slug
}
