import { GENERATED_BLOG_SEARCH_RECORDS } from '@/entities/post/config/blog-search-records.generated'
import { rerankChatEvidence } from '@/features/chat/api/rerank-chat-evidence'
import { fuseChatRetrievalMatches } from '@/features/chat/lib/chat-retrieval-fusion'
import {
  applyQuestionPlanToAnalysis,
  buildQuestionRoutingFromPlan,
  resolvePlannerCurrentPostSlug,
  shouldRunHybridRetrieval,
} from '@/features/chat/lib/chat-question-plan-routing'
import {
  analyzeQuestion,
  type ChatQuestionAnalysis,
} from '@/features/chat/lib/question-analysis'
import {
  resolveChatRequest,
  type ResolveChatRequestResult,
} from '@/features/chat/lib/resolve-chat-request'
import { shouldRerankChatEvidence } from '@/features/chat/lib/should-rerank-chat-evidence'
import type { ChatContactProfile } from '@/features/chat/model/chat-contact'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import type { ChatQuestionPlan } from '@/features/chat/model/chat-question-plan'
import { runChatRagWorkflow } from '@/features/chat/model/chat-rag-workflow'
import { getCuratedChatSources } from '@/features/chat/model/get-curated-chat-sources'
import type { SupportedLocale } from '@/shared/config/constants'

export interface RetrieveBlogChatEvidenceParams {
  question: string
  locale: SupportedLocale
  questionPlan: ChatQuestionPlan
  contactProfile?: ChatContactProfile | null
  currentPostSlug?: string
  conversationHistoryCount: number
}

export interface RetrieveBlogChatEvidenceResult {
  resolvedChatRequest: ResolveChatRequestResult
  resolvedQuestionAnalysis: ChatQuestionAnalysis
  plannerCurrentPostSlug?: string
  lexicalMatches: ChatEvidenceRecord[]
  semanticMatches: ChatEvidenceRecord[]
  finalMatches: ChatEvidenceRecord[]
  reranked: boolean
}

function buildBlogEvidenceRecords(locale: SupportedLocale): ChatEvidenceRecord[] {
  return (GENERATED_BLOG_SEARCH_RECORDS[locale] ?? []).map((record) => {
    return {
      ...record,
      sourceCategory: 'blog' as const,
    }
  })
}

function collectPreferredSourceCategories(
  questionAnalysis: ChatQuestionAnalysis,
): ChatEvidenceRecord['sourceCategory'][] {
  return [
    ...new Set(
      questionAnalysis.searchQueries.flatMap((searchQuery) => {
        return searchQuery.preferredSourceCategories
      }),
    ),
  ]
}

export async function retrieveBlogChatEvidence({
  question,
  locale,
  questionPlan,
  contactProfile,
  currentPostSlug,
  conversationHistoryCount,
}: RetrieveBlogChatEvidenceParams): Promise<RetrieveBlogChatEvidenceResult> {
  const questionBaseAnalysis = analyzeQuestion(question, locale)
  const resolvedQuestionAnalysis = applyQuestionPlanToAnalysis({
    questionAnalysis: questionBaseAnalysis,
    questionPlan,
    locale,
  })
  const questionRouting = buildQuestionRoutingFromPlan(questionPlan)
  const plannerCurrentPostSlug = resolvePlannerCurrentPostSlug({
    questionPlan,
    currentPostSlug,
  })
  const blogRecords = buildBlogEvidenceRecords(locale)
  const curatedRecords = await getCuratedChatSources(locale)
  const resolvedChatRequest = resolveChatRequest({
    question,
    locale,
    blogRecords,
    curatedRecords,
    currentPostSlug: plannerCurrentPostSlug,
    questionAnalysis: resolvedQuestionAnalysis,
    contactProfile,
    questionRouting,
  })

  if (resolvedChatRequest.directResponse) {
    return {
      resolvedChatRequest,
      resolvedQuestionAnalysis,
      plannerCurrentPostSlug,
      lexicalMatches: resolvedChatRequest.matches,
      semanticMatches: [],
      finalMatches: resolvedChatRequest.matches,
      reranked: false,
    }
  }

  const preferredSourceCategories = collectPreferredSourceCategories(
    resolvedQuestionAnalysis,
  )
  let finalMatches = resolvedChatRequest.matches
  let semanticMatches: ChatEvidenceRecord[] = []

  if (shouldRunHybridRetrieval(questionPlan)) {
    const chatRagSearchResult = await runChatRagWorkflow({
      question,
      locale,
      currentPostSlug: plannerCurrentPostSlug,
    })
    semanticMatches = chatRagSearchResult.matches
    finalMatches = fuseChatRetrievalMatches({
      lexicalMatches: resolvedChatRequest.matches,
      semanticMatches,
      preferredSourceCategories,
      currentPostSlug: plannerCurrentPostSlug,
    })
  }

  const reranked = shouldRerankChatEvidence({
    question,
    conversationHistoryCount,
    matchCount: finalMatches.length,
    questionPlan,
  })

  if (reranked) {
    finalMatches = await rerankChatEvidence({
      question,
      matches: finalMatches,
    })
  }

  return {
    resolvedChatRequest,
    resolvedQuestionAnalysis,
    plannerCurrentPostSlug,
    lexicalMatches: resolvedChatRequest.matches,
    semanticMatches,
    finalMatches,
    reranked,
  }
}
