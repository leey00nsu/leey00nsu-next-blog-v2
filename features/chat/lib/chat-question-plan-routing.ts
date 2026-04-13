import { normalizeChatQuery } from '@/features/chat/lib/chat-query-normalization'
import type {
  ChatQuestionAnalysis,
  ChatSearchQuery,
} from '@/features/chat/lib/question-analysis'
import type { ChatQuestionPlan } from '@/features/chat/model/chat-question-plan'
import type { ChatQuestionRoutingResult } from '@/features/chat/model/chat-question-routing'
import type { SupportedLocale } from '@/shared/config/constants'

function buildSearchQueryFromQuestionPlan(params: {
  questionPlan: ChatQuestionPlan
  locale: SupportedLocale
}): ChatSearchQuery {
  const normalizedChatQuery = normalizeChatQuery({
    question: params.questionPlan.standaloneQuestion,
    locale: params.locale,
  })

  return {
    question: normalizedChatQuery.normalizedSearchQuestion,
    intent: 'general',
    additionalKeywords: [
      ...new Set([
        ...normalizedChatQuery.additionalKeywords,
        ...params.questionPlan.additionalKeywords,
      ]),
    ],
    preferredSourceCategories: [
      ...new Set([
        ...normalizedChatQuery.preferredSourceCategories,
        ...params.questionPlan.preferredSourceCategories,
      ]),
    ],
  }
}

export function buildQuestionRoutingFromPlan(
  questionPlan: ChatQuestionPlan,
): ChatQuestionRoutingResult {
  if (questionPlan.deterministicAction === 'contact') {
    return {
      selector: 'contact',
      action: questionPlan.action,
      scope: questionPlan.scope,
      reason: questionPlan.reason,
    }
  }

  if (questionPlan.deterministicAction === 'latest_post') {
    return {
      selector: 'latest_post',
      action: questionPlan.action,
      scope: questionPlan.scope,
      reason: questionPlan.reason,
    }
  }

  if (questionPlan.deterministicAction === 'oldest_post') {
    return {
      selector: 'oldest_post',
      action: questionPlan.action,
      scope: questionPlan.scope,
      reason: questionPlan.reason,
    }
  }

  if (questionPlan.retrievalMode === 'current_post') {
    return {
      selector: 'current_post',
      action: questionPlan.action,
      scope: questionPlan.scope,
      reason: questionPlan.reason,
    }
  }

  if (questionPlan.retrievalMode === 'corpus') {
    return {
      selector: 'corpus',
      action: questionPlan.action,
      scope: questionPlan.scope,
      reason: questionPlan.reason,
    }
  }

  return {
    selector: 'retrieval',
    action: questionPlan.action,
    scope: questionPlan.scope,
    reason: questionPlan.reason,
  }
}

export function applyQuestionPlanToAnalysis(params: {
  questionAnalysis: ChatQuestionAnalysis
  questionPlan: ChatQuestionPlan
  locale: SupportedLocale
}): ChatQuestionAnalysis {
  const fallbackSearchQuery = buildSearchQueryFromQuestionPlan({
    questionPlan: params.questionPlan,
    locale: params.locale,
  })
  const baseSearchQueries =
    params.questionAnalysis.searchQueries.length > 0
      ? params.questionAnalysis.searchQueries
      : params.questionPlan.needsRetrieval
        ? [fallbackSearchQuery]
        : []

  return {
    ...params.questionAnalysis,
    searchQueries: baseSearchQueries.map((searchQuery) => {
      return {
        ...searchQuery,
        additionalKeywords: [
          ...new Set([
            ...searchQuery.additionalKeywords,
            ...params.questionPlan.additionalKeywords,
          ]),
        ],
        preferredSourceCategories: [
          ...new Set([
            ...searchQuery.preferredSourceCategories,
            ...params.questionPlan.preferredSourceCategories,
          ]),
        ],
      }
    }),
  }
}

export function shouldRunHybridRetrieval(
  questionPlan: ChatQuestionPlan,
): boolean {
  return (
    questionPlan.needsRetrieval &&
    (questionPlan.retrievalMode === 'standard' ||
      questionPlan.retrievalMode === 'corpus')
  )
}
