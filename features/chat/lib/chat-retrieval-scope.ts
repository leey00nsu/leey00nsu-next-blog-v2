import type { ChatSourceCategory } from '@/features/chat/model/chat-evidence'
import type { NormalizedChatIntent } from '@/features/chat/model/chat-intent'

export interface ChatResolvedEvidenceScope {
  mode: 'none' | 'current_source' | 'entity' | 'corpus'
  sourceCategory: ChatSourceCategory | null
  slug: string | null
  title: string | null
}

export function resolveScopedCurrentSourceSlug(
  evidenceScope: ChatResolvedEvidenceScope,
): string | undefined {
  if (
    evidenceScope.mode !== 'current_source' ||
    evidenceScope.sourceCategory !== 'blog' ||
    !evidenceScope.slug
  ) {
    return undefined
  }

  return evidenceScope.slug
}

export function resolveChatEvidenceScope(params: {
  intent: NormalizedChatIntent
  currentPostSlug?: string
}): ChatResolvedEvidenceScope {
  if (params.intent.evidenceScope === 'none') {
    return {
      mode: 'none',
      sourceCategory: null,
      slug: null,
      title: null,
    }
  }

  if (params.intent.evidenceScope === 'corpus') {
    return {
      mode: 'corpus',
      sourceCategory: null,
      slug: null,
      title: null,
    }
  }

  const target = params.intent.target
  const slug =
    target.slug ??
    (params.intent.evidenceScope === 'current_source' &&
    target.sourceCategory === 'blog'
      ? (params.currentPostSlug ?? null)
      : null)

  return {
    mode: params.intent.evidenceScope,
    sourceCategory: target.sourceCategory,
    slug,
    title: target.title,
  }
}
