import { answerBlogQuestion } from '@/features/chat/api/answer-blog-question'
import {
  planChatIntent,
  type PlanChatIntentResult,
} from '@/features/chat/api/plan-chat-intent-patch'
import { BLOG_CHAT } from '@/features/chat/config/constants'
import { finalizeBlogChatResponse } from '@/features/chat/lib/blog-chat-response'
import { buildFollowUpSuggestions } from '@/features/chat/lib/build-follow-up-suggestions'
import { buildChatIntentCacheKey } from '@/features/chat/lib/chat-intent-cache-key'
import { matchChatEntityCandidates } from '@/features/chat/lib/match-chat-entity-candidates'
import type { ChatAssistantProfile } from '@/features/chat/model/chat-assistant'
import type { ChatContactProfile } from '@/features/chat/model/chat-contact'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import type { ChatEntityCandidate } from '@/features/chat/model/chat-entity-candidate'
import type { NormalizedChatIntent } from '@/features/chat/model/chat-intent'
import {
  compileChatRetrievalPlan,
  type CompileChatRetrievalPlanFailureKind,
} from '@/features/chat/model/compile-chat-retrieval-plan'
import {
  executeChatIntent,
  type ExecuteChatIntentResult,
} from '@/features/chat/model/execute-chat-intent'
import {
  getCachedBlogChatResponse,
  setCachedBlogChatResponse,
} from '@/features/chat/model/blog-chat-response-cache'
import { getChatEntityCandidates } from '@/features/chat/model/get-chat-entity-candidates'
import {
  findSemanticCachedBlogChatResponse,
  storeSemanticCachedBlogChatResponse,
} from '@/features/chat/model/chat-semantic-cache'
import {
  BlogChatApplicationResponseSchema,
  BlogChatResponseSchema,
  type BlogChatApplicationResponse,
  type BlogChatModelDraft,
  type BlogChatRequest,
  type BlogChatResponse,
} from '@/features/chat/model/chat-schema'

interface PlanIntentPatchDependencyParams {
  question: string
  locale: BlogChatRequest['locale']
  conversationState: BlogChatRequest['conversationState']
  conversationHistory: BlogChatRequest['conversationHistory']
  currentPostSlug?: string
  assistantProfile?: ChatAssistantProfile | null
  entityCandidates: ChatEntityCandidate[]
}

interface AnswerQuestionDependencyResult {
  ok: boolean
  draftAnswer?: BlogChatModelDraft
  refusalReason?: 'missing_api_key' | 'model_error'
}

interface StatefulBlogChatPipelineDependencies {
  getEntityCandidates: typeof getChatEntityCandidates
  planIntent: (
    params: PlanIntentPatchDependencyParams,
  ) => Promise<PlanChatIntentResult>
  executeIntent: typeof executeChatIntent
  answerQuestion: (params: {
    question: string
    matches: ChatEvidenceRecord[]
  }) => Promise<AnswerQuestionDependencyResult>
  getCachedResponse: (cacheKey: string) => BlogChatResponse | null
  setCachedResponse: (params: {
    cacheKey: string
    responseData: BlogChatResponse
  }) => void
  findSemanticResponse: typeof findSemanticCachedBlogChatResponse
  storeSemanticResponse: typeof storeSemanticCachedBlogChatResponse
}

interface RunStatefulBlogChatPipelineParams {
  request: BlogChatRequest
  assistantProfile?: ChatAssistantProfile | null
  contactProfile?: ChatContactProfile | null
  dependencies?: Partial<StatefulBlogChatPipelineDependencies>
}

export interface StatefulBlogChatPipelineResult {
  applicationResponse: BlogChatApplicationResponse
  intent: NormalizedChatIntent | null
  execution: ExecuteChatIntentResult | null
  cacheKind: 'none' | 'exact' | 'semantic'
  plannerFailureKind:
    | 'planner_unavailable'
    | 'invalid_intent_plan'
    | CompileChatRetrievalPlanFailureKind
    | null
}

const DEFAULT_DEPENDENCIES: StatefulBlogChatPipelineDependencies = {
  getEntityCandidates: getChatEntityCandidates,
  planIntent: planChatIntent,
  executeIntent: executeChatIntent,
  answerQuestion: answerBlogQuestion,
  getCachedResponse: getCachedBlogChatResponse,
  setCachedResponse: setCachedBlogChatResponse,
  findSemanticResponse: findSemanticCachedBlogChatResponse,
  storeSemanticResponse: storeSemanticCachedBlogChatResponse,
}

function buildRefusalResponse(
  refusalReason: BlogChatResponse['refusalReason'],
): BlogChatResponse {
  return {
    answer: '',
    citations: [],
    grounded: false,
    refusalReason,
  }
}

function buildApplicationResponse(params: {
  response: BlogChatResponse
  conversationState: BlogChatRequest['conversationState']
}): BlogChatApplicationResponse {
  return BlogChatApplicationResponseSchema.parse(params)
}

async function buildModelResponse(params: {
  question: string
  matches: ChatEvidenceRecord[]
  locale: BlogChatRequest['locale']
  answerQuestion: StatefulBlogChatPipelineDependencies['answerQuestion']
}): Promise<BlogChatResponse> {
  const answerResult = await params.answerQuestion({
    question: params.question,
    matches: params.matches,
  })

  if (!answerResult.ok || !answerResult.draftAnswer) {
    return buildRefusalResponse(answerResult.refusalReason ?? 'model_error')
  }

  const response = finalizeBlogChatResponse({
    draftAnswer: answerResult.draftAnswer,
    matches: params.matches,
  })

  if (!response.grounded || response.citations.length === 0) {
    return response
  }

  return BlogChatResponseSchema.parse({
    ...response,
    followUpSuggestions: buildFollowUpSuggestions({
      locale: params.locale,
      citations: response.citations,
      matches: params.matches,
    }),
  })
}

function buildIntentAfterPlanning(params: {
  request: BlogChatRequest
  plannerResult: PlanChatIntentResult
  entityCandidates: ChatEntityCandidate[]
}): {
  intent: NormalizedChatIntent | null
  nextState: BlogChatRequest['conversationState']
  normalizationFailureKind: CompileChatRetrievalPlanFailureKind | null
} {
  if (params.plannerResult.ok) {
    const compiledResult = compileChatRetrievalPlan({
      queryPlan: params.plannerResult.queryPlan,
      candidates: params.entityCandidates,
      previousState: params.request.conversationState,
      currentPostSlug: params.request.currentPostSlug,
      maximumEvidenceCount: BLOG_CHAT.SEARCH.TOP_K,
    })

    if (!compiledResult.ok) {
      return {
        intent: null,
        nextState: params.request.conversationState,
        normalizationFailureKind: compiledResult.failureKind,
      }
    }

    return {
      intent: compiledResult.compatibilityIntent,
      nextState: compiledResult.nextConversationState,
      normalizationFailureKind: null,
    }
  }

  return {
    intent: null,
    nextState: params.request.conversationState,
    normalizationFailureKind: null,
  }
}

export async function runStatefulBlogChatPipeline({
  request,
  assistantProfile,
  contactProfile,
  dependencies: dependencyOverrides = {},
}: RunStatefulBlogChatPipelineParams): Promise<StatefulBlogChatPipelineResult> {
  const dependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...dependencyOverrides,
  }
  const allEntityCandidates = await dependencies.getEntityCandidates(
    request.locale,
  )
  const entityCandidates = matchChatEntityCandidates({
    question: request.question,
    candidates: allEntityCandidates,
  })
  const plannerResult = await dependencies.planIntent({
    question: request.question,
    locale: request.locale,
    conversationState: request.conversationState,
    conversationHistory: request.conversationHistory,
    currentPostSlug: request.currentPostSlug,
    assistantProfile,
    entityCandidates,
  })
  const { intent, nextState, normalizationFailureKind } =
    buildIntentAfterPlanning({
      request,
      plannerResult,
      entityCandidates,
    })
  const plannerFailureKind = plannerResult.ok
    ? normalizationFailureKind
    : plannerResult.failureKind

  if (!intent) {
    return {
      applicationResponse: buildApplicationResponse({
        response: buildRefusalResponse(
          plannerResult.ok ? 'model_error' : plannerResult.refusalReason,
        ),
        conversationState: nextState,
      }),
      intent: null,
      execution: null,
      cacheKind: 'none',
      plannerFailureKind,
    }
  }

  const cacheKey = buildChatIntentCacheKey({
    locale: request.locale,
    intent,
    currentPostSlug: request.currentPostSlug,
    evidenceVersion: BLOG_CHAT.EVIDENCE_VERSION,
  })
  const shouldReadCache =
    intent.missingSlots.length === 0 && intent.operation !== 'social_reply'
  const exactCachedResponse = shouldReadCache
    ? dependencies.getCachedResponse(cacheKey)
    : null

  if (exactCachedResponse) {
    return {
      applicationResponse: buildApplicationResponse({
        response: exactCachedResponse,
        conversationState: nextState,
      }),
      intent,
      execution: null,
      cacheKind: 'exact',
      plannerFailureKind,
    }
  }

  const semanticCachedResponse = shouldReadCache
    ? await dependencies.findSemanticResponse({
        locale: request.locale,
        question: intent.standaloneQuestion,
        currentPostSlug: request.currentPostSlug,
        intentCacheKey: cacheKey,
      })
    : undefined

  if (semanticCachedResponse) {
    return {
      applicationResponse: buildApplicationResponse({
        response: semanticCachedResponse,
        conversationState: nextState,
      }),
      intent,
      execution: null,
      cacheKind: 'semantic',
      plannerFailureKind,
    }
  }

  const execution = await dependencies.executeIntent({
    intent,
    locale: request.locale,
    conversationHistoryCount: request.conversationHistory.length,
    assistantProfile,
    contactProfile,
    currentPostSlug: request.currentPostSlug,
  })
  const response =
    execution.kind === 'direct'
      ? execution.response
      : execution.kind === 'model'
        ? await buildModelResponse({
            question: execution.question,
            matches: execution.matches,
            locale: request.locale,
            answerQuestion: dependencies.answerQuestion,
          })
        : buildRefusalResponse(execution.refusalReason)

  if (response.grounded) {
    dependencies.setCachedResponse({
      cacheKey,
      responseData: response,
    })
    await dependencies.storeSemanticResponse({
      locale: request.locale,
      question: intent.standaloneQuestion,
      currentPostSlug: request.currentPostSlug,
      intentCacheKey: cacheKey,
      response,
    })
  }

  return {
    applicationResponse: buildApplicationResponse({
      response,
      conversationState: nextState,
    }),
    intent,
    execution,
    cacheKind: 'none',
    plannerFailureKind,
  }
}
