import { BLOG_CHAT } from '@/features/chat/config/constants'
import { buildChatRefusalResponse } from '@/features/chat/lib/build-chat-refusal-response'
import { normalizeQuestionText } from '@/features/chat/lib/chat-query-normalization'
import { cleanupExpiredBlogChatResponseCache } from '@/features/chat/model/blog-chat-response-cache'
import {
  acquireBlogChatConcurrentRequestSlot,
  consumeBlogChatDailyUsage,
  consumeBlogChatRequestRateLimit,
  releaseBlogChatConcurrentRequestSlot,
  resolveBlogChatClientKey,
} from '@/features/chat/model/blog-chat-usage-limiter'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import { recordChatObservabilityEvent } from '@/features/chat/model/chat-observability'
import { getChatAssistantProfile } from '@/features/chat/model/get-chat-assistant-profile'
import { getChatContactProfile } from '@/features/chat/model/get-chat-contact-profile'
import {
  runChatWorkflow,
  type ChatWorkflowResult,
} from '@/features/chat/model/chat-workflow'
import {
  type BlogChatApplicationResponse,
  BlogChatRequestSchema,
  BlogChatResponseSchema,
  type BlogChatResponse,
} from '@/features/chat/model/chat-schema'
import { LOCALES, type SupportedLocale } from '@/shared/config/constants'

interface ChatObservabilityState {
  originalQuestion: string
  resolvedQuestion: string | null
  normalizedQuestion: string | null
  currentPostSlug?: string
  cacheKind: 'none' | 'exact' | 'semantic'
  reranked: boolean
  plannerReason: string | null
  intentOperation: string | null
  intentTargetKind: string | null
  intentEvidenceScope: string | null
  intentTemporalOrder: string | null
  intentRequestedFields: string[]
  intentRequiredConcepts: string[]
  intentOptionalConcepts: string[]
  plannerFailureKind: string | null
  queryOperation: string | null
  sourceStrategy: string | null
  sourceCategories: string[]
  temporalStrategy: string | null
  temporalOrder: string | null
  executionKind: string | null
  graphPath: string[]
  lexicalMatches: ChatEvidenceRecord[]
  semanticMatches: ChatEvidenceRecord[]
  finalMatches: ChatEvidenceRecord[]
}

export interface AnswerBlogChatQuestionParams {
  requestBody: unknown
  requestHeaders: Headers
}

export interface BlogChatApplicationResult {
  body: BlogChatResponse | BlogChatApplicationResponse | Record<string, unknown>
  status?: number
}

const CHAT_APPLICATION = {
  VALIDATION_ERROR_MESSAGE:
    '요청 내용을 확인하는 중 문제가 있었어요. 입력한 내용을 한 번만 다시 확인해주세요.',
  UNEXPECTED_ERROR_MESSAGE:
    '답변을 준비하는 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.',
} as const

function summarizeMatches(matches: ChatEvidenceRecord[]) {
  return matches.map((match) => {
    return {
      url: match.url,
      title: match.title,
      sourceCategory: match.sourceCategory,
    }
  })
}

async function recordAnswerObservability(params: {
  locale: SupportedLocale
  responseData: BlogChatResponse
  requestStartedAt: number
  chatObservabilityState: ChatObservabilityState
}): Promise<void> {
  await recordChatObservabilityEvent({
    locale: params.locale,
    originalQuestion: params.chatObservabilityState.originalQuestion,
    answer: params.responseData.answer,
    resolvedQuestion: params.chatObservabilityState.resolvedQuestion,
    normalizedQuestion: params.chatObservabilityState.normalizedQuestion,
    currentPostSlug: params.chatObservabilityState.currentPostSlug,
    cacheKind: params.chatObservabilityState.cacheKind,
    reranked: params.chatObservabilityState.reranked,
    plannerReason: params.chatObservabilityState.plannerReason,
    intentOperation: params.chatObservabilityState.intentOperation,
    intentTargetKind: params.chatObservabilityState.intentTargetKind,
    intentEvidenceScope: params.chatObservabilityState.intentEvidenceScope,
    intentTemporalOrder: params.chatObservabilityState.intentTemporalOrder,
    intentRequestedFields: params.chatObservabilityState.intentRequestedFields,
    intentRequiredConcepts:
      params.chatObservabilityState.intentRequiredConcepts,
    intentOptionalConcepts:
      params.chatObservabilityState.intentOptionalConcepts,
    plannerFailureKind: params.chatObservabilityState.plannerFailureKind,
    queryOperation: params.chatObservabilityState.queryOperation,
    sourceStrategy: params.chatObservabilityState.sourceStrategy,
    sourceCategories: params.chatObservabilityState.sourceCategories,
    temporalStrategy: params.chatObservabilityState.temporalStrategy,
    temporalOrder: params.chatObservabilityState.temporalOrder,
    executionKind: params.chatObservabilityState.executionKind,
    graphPath: params.chatObservabilityState.graphPath,
    lexicalMatches: summarizeMatches(
      params.chatObservabilityState.lexicalMatches,
    ),
    semanticMatches: summarizeMatches(
      params.chatObservabilityState.semanticMatches,
    ),
    finalMatches: summarizeMatches(params.chatObservabilityState.finalMatches),
    citations: params.responseData.citations.map((citation) => {
      return {
        url: citation.url,
        title: citation.title,
        sourceCategory: citation.sourceCategory,
      }
    }),
    grounded: params.responseData.grounded,
    refusalReason: params.responseData.refusalReason ?? null,
    durationMilliseconds: Date.now() - params.requestStartedAt,
  })
}

async function buildLoggedWorkflowResult(params: {
  locale: SupportedLocale
  workflowResult: ChatWorkflowResult
  requestStartedAt: number
  chatObservabilityState: ChatObservabilityState
}): Promise<BlogChatApplicationResult> {
  try {
    await recordAnswerObservability({
      locale: params.locale,
      responseData: params.workflowResult.applicationResponse.response,
      requestStartedAt: params.requestStartedAt,
      chatObservabilityState: params.chatObservabilityState,
    })
  } catch (error) {
    console.error('Failed to record chat observability event.', error)
  }

  return {
    body: params.workflowResult.applicationResponse,
  }
}

function buildValidationErrorResult(requestBody: unknown) {
  if (
    typeof (requestBody as { question?: unknown })?.question === 'string' &&
    (requestBody as { question: string }).question.trim().length >
      BLOG_CHAT.INPUT.MAXIMUM_QUESTION_CHARACTERS
  ) {
    return {
      body: BlogChatResponseSchema.parse(
        buildChatRefusalResponse({
          locale: resolveRequestLocale(requestBody),
          refusalReason: 'question_too_long',
        }),
      ),
    }
  }

  const parsedRequest = BlogChatRequestSchema.safeParse(requestBody)

  return {
    body: {
      error: CHAT_APPLICATION.VALIDATION_ERROR_MESSAGE,
      details: parsedRequest.success ? null : parsedRequest.error.flatten(),
    },
    status: 400,
  }
}

function resolveRequestLocale(requestBody: unknown): SupportedLocale {
  if (
    requestBody &&
    typeof requestBody === 'object' &&
    'locale' in requestBody &&
    LOCALES.SUPPORTED.includes(requestBody.locale as SupportedLocale)
  ) {
    return requestBody.locale as SupportedLocale
  }

  return LOCALES.DEFAULT
}

function buildChatObservabilityState(params: {
  originalQuestion: string
  currentPostSlug?: string
  workflowResult: ChatWorkflowResult
}): ChatObservabilityState {
  const queryPlan = params.workflowResult.queryPlan
  const retrievalPlan = params.workflowResult.retrievalPlan
  const execution = params.workflowResult.execution
  const evidenceExecution = execution?.kind === 'evidence' ? execution : null
  const canonicalTarget = retrievalPlan?.canonicalTargets[0]

  return {
    originalQuestion: params.originalQuestion,
    resolvedQuestion: retrievalPlan?.standaloneQuestion ?? null,
    normalizedQuestion: retrievalPlan
      ? normalizeQuestionText(retrievalPlan.standaloneQuestion)
      : null,
    currentPostSlug: params.currentPostSlug,
    cacheKind: params.workflowResult.cacheKind,
    reranked: evidenceExecution?.reranked ?? false,
    plannerReason: queryPlan?.reason ?? null,
    intentOperation: retrievalPlan?.operation ?? null,
    intentTargetKind: canonicalTarget?.kind ?? null,
    intentEvidenceScope: retrievalPlan?.sourceStrategy ?? null,
    intentTemporalOrder: retrievalPlan?.temporalOrder ?? null,
    intentRequestedFields: [...(retrievalPlan?.requestedFields ?? [])],
    intentRequiredConcepts: [...(retrievalPlan?.requiredConcepts ?? [])],
    intentOptionalConcepts: [...(retrievalPlan?.optionalConcepts ?? [])],
    plannerFailureKind: params.workflowResult.failureKind,
    queryOperation: queryPlan?.operation ?? null,
    sourceStrategy: retrievalPlan?.sourceStrategy ?? null,
    sourceCategories: [...(retrievalPlan?.sourceCategories ?? [])],
    temporalStrategy: retrievalPlan?.temporalStrategy ?? null,
    temporalOrder: retrievalPlan?.temporalOrder ?? null,
    executionKind: retrievalPlan?.executionKind ?? null,
    graphPath: params.workflowResult.graphPath,
    lexicalMatches: evidenceExecution?.lexicalMatches ?? [],
    semanticMatches: evidenceExecution?.semanticMatches ?? [],
    finalMatches: execution?.matches ?? [],
  }
}

export async function answerBlogChatQuestion({
  requestBody,
  requestHeaders,
}: AnswerBlogChatQuestionParams): Promise<BlogChatApplicationResult> {
  try {
    const parsedRequest = BlogChatRequestSchema.safeParse(requestBody)

    if (!parsedRequest.success) {
      return buildValidationErrorResult(requestBody)
    }

    const locale: SupportedLocale = parsedRequest.data.locale ?? LOCALES.DEFAULT

    const clientKey = resolveBlogChatClientKey(requestHeaders)
    const rateLimitResult = consumeBlogChatRequestRateLimit({
      clientKey,
      windowMilliseconds: BLOG_CHAT.RATE_LIMIT.WINDOW_MILLISECONDS,
      maximumRequestsPerWindow:
        BLOG_CHAT.RATE_LIMIT.MAXIMUM_REQUESTS_PER_WINDOW,
    })

    if (!rateLimitResult.allowed) {
      return {
        body: BlogChatResponseSchema.parse(
          buildChatRefusalResponse({
            locale,
            refusalReason: 'rate_limited',
          }),
        ),
      }
    }

    const concurrentRequestResult = acquireBlogChatConcurrentRequestSlot({
      clientKey,
      maximumConcurrentRequests:
        BLOG_CHAT.RATE_LIMIT.MAXIMUM_CONCURRENT_REQUESTS,
    })

    if (!concurrentRequestResult.allowed) {
      return {
        body: BlogChatResponseSchema.parse(
          buildChatRefusalResponse({
            locale,
            refusalReason: 'rate_limited',
          }),
        ),
      }
    }

    try {
      const requestStartedAt = Date.now()
      const dailyUsageResult = consumeBlogChatDailyUsage({
        maximumDailyRequests: BLOG_CHAT.LIMIT.MAXIMUM_DAILY_REQUESTS,
      })

      if (!dailyUsageResult.allowed) {
        return {
          body: BlogChatResponseSchema.parse(
            buildChatRefusalResponse({
              locale,
              refusalReason: 'daily_limit_exceeded',
            }),
          ),
        }
      }

      cleanupExpiredBlogChatResponseCache({
        ttlMilliseconds: BLOG_CHAT.CACHE.TTL_MILLISECONDS,
      })

      const workflowResult = await runChatWorkflow({
        request: parsedRequest.data,
        assistantProfile: getChatAssistantProfile(locale),
        contactProfile: getChatContactProfile(locale),
      })
      const chatObservabilityState = buildChatObservabilityState({
        originalQuestion: parsedRequest.data.question,
        currentPostSlug: parsedRequest.data.currentPostSlug,
        workflowResult,
      })

      return buildLoggedWorkflowResult({
        locale,
        workflowResult,
        requestStartedAt,
        chatObservabilityState,
      })
    } finally {
      releaseBlogChatConcurrentRequestSlot({ clientKey })
    }
  } catch {
    return {
      body: {
        error: CHAT_APPLICATION.UNEXPECTED_ERROR_MESSAGE,
      },
      status: 500,
    }
  }
}
