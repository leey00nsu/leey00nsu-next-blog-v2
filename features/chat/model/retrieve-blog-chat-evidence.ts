import { GENERATED_BLOG_SEARCH_RECORDS } from '@/entities/post/config/blog-search-records.generated'
import { rerankChatEvidence } from '@/features/chat/api/rerank-chat-evidence'
import { selectEvidenceCoveringRequiredConcepts } from '@/features/chat/lib/chat-required-concepts'
import {
  resolveChatEvidenceScope,
  resolveScopedCurrentSourceSlug,
} from '@/features/chat/lib/chat-retrieval-scope'
import {
  resolveChatIntentRequest,
  type ResolveChatIntentRequestResult,
} from '@/features/chat/lib/resolve-chat-intent-request'
import { selectFinalChatEvidence } from '@/features/chat/lib/select-final-chat-evidence'
import { shouldRerankChatEvidence } from '@/features/chat/lib/should-rerank-chat-evidence'
import type { ChatContactProfile } from '@/features/chat/model/chat-contact'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import type { NormalizedChatIntent } from '@/features/chat/model/chat-intent'
import { runChatRagWorkflow } from '@/features/chat/model/chat-rag-workflow'
import { getCuratedChatSources } from '@/features/chat/model/get-curated-chat-sources'
import type { SupportedLocale } from '@/shared/config/constants'

export interface RetrieveBlogChatEvidenceParams {
  intent: NormalizedChatIntent
  locale: SupportedLocale
  contactProfile?: ChatContactProfile | null
  currentPostSlug?: string
  conversationHistoryCount: number
}

export interface RetrieveBlogChatEvidenceResult {
  resolvedChatRequest: ResolveChatIntentRequestResult
  evidenceScope: ReturnType<typeof resolveChatEvidenceScope>
  lexicalMatches: ChatEvidenceRecord[]
  semanticMatches: ChatEvidenceRecord[]
  finalMatches: ChatEvidenceRecord[]
  reranked: boolean
}

function buildBlogEvidenceRecords(
  locale: SupportedLocale,
): ChatEvidenceRecord[] {
  return (GENERATED_BLOG_SEARCH_RECORDS[locale] ?? []).map((record) => {
    return {
      ...record,
      sourceCategory: 'blog' as const,
    }
  })
}

export async function retrieveBlogChatEvidence({
  intent,
  locale,
  contactProfile,
  currentPostSlug,
  conversationHistoryCount,
}: RetrieveBlogChatEvidenceParams): Promise<RetrieveBlogChatEvidenceResult> {
  const evidenceScope = resolveChatEvidenceScope({
    intent,
    currentPostSlug,
  })
  const scopedCurrentPostSlug = resolveScopedCurrentSourceSlug(evidenceScope)
  const blogRecords = buildBlogEvidenceRecords(locale)
  const curatedRecords = await getCuratedChatSources(locale)
  const resolvedChatRequest = resolveChatIntentRequest({
    intent,
    locale,
    blogRecords,
    curatedRecords,
    currentPostSlug: scopedCurrentPostSlug ?? currentPostSlug,
    contactProfile,
  })

  if (resolvedChatRequest.directResponse) {
    return {
      resolvedChatRequest,
      evidenceScope,
      lexicalMatches: resolvedChatRequest.matches,
      semanticMatches: [],
      finalMatches: resolvedChatRequest.matches,
      reranked: false,
    }
  }

  const shouldRunSemanticRetrieval =
    resolvedChatRequest.shouldCallModel && evidenceScope.mode !== 'none'
  let semanticMatches: ChatEvidenceRecord[] = []

  if (shouldRunSemanticRetrieval) {
    const semanticSearchResult = await runChatRagWorkflow({
      question: intent.standaloneQuestion,
      locale,
      currentPostSlug: scopedCurrentPostSlug,
      evidenceScope,
    })
    semanticMatches = semanticSearchResult.matches
  }

  let finalMatches = selectFinalChatEvidence({
    question: intent.standaloneQuestion,
    locale,
    intent,
    evidenceScope,
    lexicalMatches: resolvedChatRequest.matches,
    semanticMatches,
  })
  const reranked = shouldRerankChatEvidence({
    question: intent.standaloneQuestion,
    conversationHistoryCount,
    matchCount: finalMatches.length,
    intent,
  })

  if (reranked) {
    finalMatches = await rerankChatEvidence({
      question: intent.standaloneQuestion,
      matches: finalMatches,
    })
    finalMatches = selectEvidenceCoveringRequiredConcepts({
      matches: finalMatches,
      requiredConcepts: intent.requiredConcepts,
      locale,
    })
  }

  return {
    resolvedChatRequest,
    evidenceScope,
    lexicalMatches: resolvedChatRequest.matches,
    semanticMatches,
    finalMatches,
    reranked,
  }
}
