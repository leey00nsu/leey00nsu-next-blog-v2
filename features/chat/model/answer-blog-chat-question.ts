import { BLOG_CHAT } from '@/features/chat/config/constants'
import { normalizeQuestion } from '@/features/chat/lib/question-analysis'
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
  runStatefulBlogChatPipeline,
  type StatefulBlogChatPipelineResult,
} from '@/features/chat/model/run-stateful-blog-chat-pipeline'
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

async function buildLoggedStatefulResult(params: {
  locale: SupportedLocale
  pipelineResult: StatefulBlogChatPipelineResult
  requestStartedAt: number
  chatObservabilityState: ChatObservabilityState
}): Promise<BlogChatApplicationResult> {
  try {
    await recordAnswerObservability({
      locale: params.locale,
      responseData: params.pipelineResult.applicationResponse.response,
      requestStartedAt: params.requestStartedAt,
      chatObservabilityState: params.chatObservabilityState,
    })
  } catch (error) {
    console.error('Failed to record chat observability event.', error)
  }

  return {
    body: params.pipelineResult.applicationResponse,
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
        buildRefusalResponse('question_too_long'),
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

function buildChatObservabilityState(params: {
  originalQuestion: string
  currentPostSlug?: string
  pipelineResult: StatefulBlogChatPipelineResult
}): ChatObservabilityState {
  const intent = params.pipelineResult.intent
  const evidenceResult = params.pipelineResult.execution?.evidenceResult

  return {
    originalQuestion: params.originalQuestion,
    resolvedQuestion: intent?.standaloneQuestion ?? null,
    normalizedQuestion: intent
      ? normalizeQuestion(intent.standaloneQuestion)
      : null,
    currentPostSlug: params.currentPostSlug,
    cacheKind: params.pipelineResult.cacheKind,
    reranked: evidenceResult?.reranked ?? false,
    plannerReason: intent?.reason ?? null,
    intentOperation: intent?.operation ?? null,
    intentTargetKind: intent?.target.kind ?? null,
    intentEvidenceScope: intent?.evidenceScope ?? null,
    intentTemporalOrder: intent?.temporalConstraint.order ?? null,
    intentRequestedFields: [...(intent?.requestedFields ?? [])],
    intentRequiredConcepts: [...(intent?.requiredConcepts ?? [])],
    intentOptionalConcepts: [...(intent?.optionalConcepts ?? [])],
    plannerFailureKind: params.pipelineResult.plannerFailureKind,
    lexicalMatches: evidenceResult?.lexicalMatches ?? [],
    semanticMatches: evidenceResult?.semanticMatches ?? [],
    finalMatches: evidenceResult?.finalMatches ?? [],
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
          buildRefusalResponse('rate_limited'),
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
          buildRefusalResponse('rate_limited'),
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
            buildRefusalResponse('daily_limit_exceeded'),
          ),
        }
      }

      cleanupExpiredBlogChatResponseCache({
        ttlMilliseconds: BLOG_CHAT.CACHE.TTL_MILLISECONDS,
      })

      const locale: SupportedLocale =
        parsedRequest.data.locale ?? LOCALES.DEFAULT
      const pipelineResult = await runStatefulBlogChatPipeline({
        request: parsedRequest.data,
        assistantProfile: getChatAssistantProfile(locale),
        contactProfile: getChatContactProfile(locale),
      })
      const chatObservabilityState = buildChatObservabilityState({
        originalQuestion: parsedRequest.data.question,
        currentPostSlug: parsedRequest.data.currentPostSlug,
        pipelineResult,
      })

      return buildLoggedStatefulResult({
        locale,
        pipelineResult,
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
