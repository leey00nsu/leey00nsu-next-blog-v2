import { answerBlogQuestion } from '@/features/chat/api/answer-blog-question'
import { planChatQuestion } from '@/features/chat/api/plan-chat-question'
import { BLOG_CHAT } from '@/features/chat/config/constants'
import { shouldCacheBlogChatResponse } from '@/features/chat/lib/blog-chat-cache'
import { finalizeBlogChatResponse } from '@/features/chat/lib/blog-chat-response'
import { buildFollowUpSuggestions } from '@/features/chat/lib/build-follow-up-suggestions'
import { normalizeQuestion } from '@/features/chat/lib/question-analysis'
import {
  cleanupExpiredBlogChatResponseCache,
  getCachedBlogChatResponse,
  setCachedBlogChatResponse,
} from '@/features/chat/model/blog-chat-response-cache'
import {
  acquireBlogChatConcurrentRequestSlot,
  consumeBlogChatDailyUsage,
  consumeBlogChatRequestRateLimit,
  releaseBlogChatConcurrentRequestSlot,
  resolveBlogChatClientKey,
} from '@/features/chat/model/blog-chat-usage-limiter'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import { recordChatObservabilityEvent } from '@/features/chat/model/chat-observability'
import type { ChatQuestionPlan } from '@/features/chat/model/chat-question-plan'
import {
  findSemanticCachedBlogChatResponse,
  storeSemanticCachedBlogChatResponse,
} from '@/features/chat/model/chat-semantic-cache'
import { getChatAssistantProfile } from '@/features/chat/model/get-chat-assistant-profile'
import { getChatContactProfile } from '@/features/chat/model/get-chat-contact-profile'
import { retrieveBlogChatEvidence } from '@/features/chat/model/retrieve-blog-chat-evidence'
import {
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
  plannerAction: string | null
  plannerRetrievalMode: string | null
  plannerDeterministicAction: string | null
  preferredSourceCategories: string[]
  additionalKeywords: string[]
  lexicalMatches: ChatEvidenceRecord[]
  semanticMatches: ChatEvidenceRecord[]
  finalMatches: ChatEvidenceRecord[]
}

export interface AnswerBlogChatQuestionParams {
  requestBody: unknown
  requestHeaders: Headers
}

export interface BlogChatApplicationResult {
  body: BlogChatResponse | Record<string, unknown>
  status?: number
}

const CHAT_APPLICATION = {
  FALLBACK_SOCIAL_REPLIES: {
    ko: '안녕하세요. 무엇을 찾고 계신가요?',
    en: 'Hi there. What are you looking for?',
  },
  FALLBACK_CLARIFICATION_QUESTIONS: {
    ko: '누구를 가리키는지 조금 더 구체적으로 적어주세요.',
    en: 'Please clarify who you mean a bit more specifically.',
  },
  VALIDATION_ERROR_MESSAGE:
    '요청 내용을 확인하는 중 문제가 있었어요. 입력한 내용을 한 번만 다시 확인해주세요.',
  UNEXPECTED_ERROR_MESSAGE:
    '답변을 준비하는 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.',
} as const

function buildCacheKey(
  normalizedQuestion: string,
  locale: string,
  currentPostSlug?: string,
): string {
  return `${locale}:${currentPostSlug ?? 'global'}:${normalizedQuestion}`
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

async function buildModelBackedResponse(params: {
  question: string
  matches: ChatEvidenceRecord[]
}): Promise<BlogChatResponse> {
  const answerResult = await answerBlogQuestion({
    question: params.question,
    matches: params.matches,
  })

  const responseData =
    answerResult.ok && answerResult.draftAnswer
      ? finalizeBlogChatResponse({
          draftAnswer: answerResult.draftAnswer,
          matches: params.matches,
        })
      : buildRefusalResponse(answerResult.refusalReason ?? 'model_error')

  return BlogChatResponseSchema.parse(responseData)
}

function cacheResponseIfNeeded(params: {
  cacheKey: string
  responseData: BlogChatResponse
}): void {
  if (!shouldCacheBlogChatResponse(params.responseData)) {
    return
  }

  setCachedBlogChatResponse({
    cacheKey: params.cacheKey,
    responseData: params.responseData,
  })
}

function buildSocialReplyResponse(params: {
  locale: string
  assistantProfile: ReturnType<typeof getChatAssistantProfile>
}): BlogChatResponse {
  return {
    answer:
      params.assistantProfile?.greetingAnswer ??
      CHAT_APPLICATION.FALLBACK_SOCIAL_REPLIES[
        params.locale as keyof typeof CHAT_APPLICATION.FALLBACK_SOCIAL_REPLIES
      ] ??
      CHAT_APPLICATION.FALLBACK_SOCIAL_REPLIES[LOCALES.DEFAULT],
    citations: [],
    grounded: false,
  }
}

function buildClarificationResponse(params: {
  locale: string
  questionPlan: ChatQuestionPlan
}): BlogChatResponse {
  return {
    answer:
      params.questionPlan.clarificationQuestion ??
      CHAT_APPLICATION.FALLBACK_CLARIFICATION_QUESTIONS[
        params.locale as keyof typeof CHAT_APPLICATION.FALLBACK_CLARIFICATION_QUESTIONS
      ] ??
      CHAT_APPLICATION.FALLBACK_CLARIFICATION_QUESTIONS[LOCALES.DEFAULT],
    citations: [],
    grounded: false,
  }
}

function buildPlannerFailureResponse(
  refusalReason: Extract<
    BlogChatResponse['refusalReason'],
    'missing_api_key' | 'model_error'
  >,
): BlogChatResponse {
  return buildRefusalResponse(refusalReason)
}

function buildResponseWithFollowUpSuggestions(params: {
  locale: SupportedLocale
  responseData: BlogChatResponse
  matches: ChatEvidenceRecord[]
}): BlogChatResponse {
  if (
    !params.responseData.grounded ||
    params.responseData.citations.length === 0
  ) {
    return params.responseData
  }

  return BlogChatResponseSchema.parse({
    ...params.responseData,
    followUpSuggestions: buildFollowUpSuggestions({
      locale: params.locale,
      citations: params.responseData.citations,
      matches: params.matches,
    }),
  })
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
    resolvedQuestion: params.chatObservabilityState.resolvedQuestion,
    normalizedQuestion: params.chatObservabilityState.normalizedQuestion,
    currentPostSlug: params.chatObservabilityState.currentPostSlug,
    cacheKind: params.chatObservabilityState.cacheKind,
    reranked: params.chatObservabilityState.reranked,
    plannerReason: params.chatObservabilityState.plannerReason,
    plannerAction: params.chatObservabilityState.plannerAction,
    plannerRetrievalMode: params.chatObservabilityState.plannerRetrievalMode,
    plannerDeterministicAction:
      params.chatObservabilityState.plannerDeterministicAction,
    preferredSourceCategories:
      params.chatObservabilityState.preferredSourceCategories,
    additionalKeywords: params.chatObservabilityState.additionalKeywords,
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

async function buildLoggedResult(params: {
  locale: SupportedLocale
  responseData: BlogChatResponse
  requestStartedAt: number
  chatObservabilityState: ChatObservabilityState
}): Promise<BlogChatApplicationResult> {
  try {
    await recordAnswerObservability(params)
  } catch (error) {
    console.error('Failed to record chat observability event.', error)
  }

  return {
    body: BlogChatResponseSchema.parse(params.responseData),
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
      const originalQuestion = parsedRequest.data.question
      const chatObservabilityState: ChatObservabilityState = {
        originalQuestion,
        resolvedQuestion: null,
        normalizedQuestion: null,
        currentPostSlug: parsedRequest.data.currentPostSlug,
        cacheKind: 'none',
        reranked: false,
        plannerReason: null,
        plannerAction: null,
        plannerRetrievalMode: null,
        plannerDeterministicAction: null,
        preferredSourceCategories: [],
        additionalKeywords: [],
        lexicalMatches: [],
        semanticMatches: [],
        finalMatches: [],
      }
      const assistantProfile = getChatAssistantProfile(locale)
      const contactProfile = getChatContactProfile(locale)
      const questionPlan = await planChatQuestion({
        question: originalQuestion,
        locale,
        conversationHistory: parsedRequest.data.conversationHistory,
        currentPostSlug: parsedRequest.data.currentPostSlug,
        assistantProfile,
      })

      if (!questionPlan.ok) {
        chatObservabilityState.plannerReason = questionPlan.refusalReason
        const plannerFailureResponse = BlogChatResponseSchema.parse(
          buildPlannerFailureResponse(questionPlan.refusalReason),
        )

        cacheResponseIfNeeded({
          cacheKey: buildCacheKey(
            normalizeQuestion(originalQuestion),
            locale,
            parsedRequest.data.currentPostSlug,
          ),
          responseData: plannerFailureResponse,
        })

        return buildLoggedResult({
          locale,
          responseData: plannerFailureResponse,
          requestStartedAt,
          chatObservabilityState,
        })
      }

      const resolvedQuestion = questionPlan.questionPlan.standaloneQuestion
      const normalizedQuestion = normalizeQuestion(resolvedQuestion)
      chatObservabilityState.resolvedQuestion = resolvedQuestion
      chatObservabilityState.normalizedQuestion = normalizedQuestion
      chatObservabilityState.plannerReason = questionPlan.questionPlan.reason
      chatObservabilityState.plannerAction = questionPlan.questionPlan.action
      chatObservabilityState.plannerRetrievalMode =
        questionPlan.questionPlan.retrievalMode
      chatObservabilityState.plannerDeterministicAction =
        questionPlan.questionPlan.deterministicAction
      chatObservabilityState.preferredSourceCategories = [
        ...questionPlan.questionPlan.preferredSourceCategories,
      ]
      chatObservabilityState.additionalKeywords = [
        ...questionPlan.questionPlan.additionalKeywords,
      ]
      const cacheKey = buildCacheKey(
        normalizedQuestion,
        locale,
        parsedRequest.data.currentPostSlug,
      )
      const cachedResponse = getCachedBlogChatResponse(cacheKey)

      if (cachedResponse) {
        chatObservabilityState.cacheKind = 'exact'

        return buildLoggedResult({
          locale,
          responseData: cachedResponse,
          requestStartedAt,
          chatObservabilityState,
        })
      }

      if (questionPlan.questionPlan.deterministicAction === 'social_reply') {
        const socialReplyResponse = BlogChatResponseSchema.parse(
          buildSocialReplyResponse({
            locale,
            assistantProfile,
          }),
        )

        cacheResponseIfNeeded({
          cacheKey,
          responseData: socialReplyResponse,
        })

        return buildLoggedResult({
          locale,
          responseData: socialReplyResponse,
          requestStartedAt,
          chatObservabilityState,
        })
      }

      if (questionPlan.questionPlan.needsClarification) {
        const clarificationResponse = BlogChatResponseSchema.parse(
          buildClarificationResponse({
            locale,
            questionPlan: questionPlan.questionPlan,
          }),
        )

        cacheResponseIfNeeded({
          cacheKey,
          responseData: clarificationResponse,
        })

        return buildLoggedResult({
          locale,
          responseData: clarificationResponse,
          requestStartedAt,
          chatObservabilityState,
        })
      }

      const semanticCachedResponse = await findSemanticCachedBlogChatResponse({
        locale,
        question: resolvedQuestion,
        currentPostSlug: parsedRequest.data.currentPostSlug,
      })

      if (semanticCachedResponse) {
        chatObservabilityState.cacheKind = 'semantic'

        return buildLoggedResult({
          locale,
          responseData: semanticCachedResponse,
          requestStartedAt,
          chatObservabilityState,
        })
      }

      const evidenceResult = await retrieveBlogChatEvidence({
        question: resolvedQuestion,
        locale,
        questionPlan: questionPlan.questionPlan,
        contactProfile,
        currentPostSlug: parsedRequest.data.currentPostSlug,
        conversationHistoryCount: parsedRequest.data.conversationHistory.length,
      })
      const resolvedChatRequest = evidenceResult.resolvedChatRequest
      const combinedMatches = evidenceResult.finalMatches
      chatObservabilityState.lexicalMatches = evidenceResult.lexicalMatches
      chatObservabilityState.semanticMatches = evidenceResult.semanticMatches
      chatObservabilityState.finalMatches = evidenceResult.finalMatches
      chatObservabilityState.reranked = evidenceResult.reranked

      if (resolvedChatRequest.directResponse) {
        const validatedDirectResponse = buildResponseWithFollowUpSuggestions({
          locale,
          responseData: BlogChatResponseSchema.parse(
            resolvedChatRequest.directResponse,
          ),
          matches: combinedMatches,
        })

        cacheResponseIfNeeded({
          cacheKey,
          responseData: validatedDirectResponse,
        })

        return buildLoggedResult({
          locale,
          responseData: validatedDirectResponse,
          requestStartedAt,
          chatObservabilityState,
        })
      }

      const shouldCallModel =
        resolvedChatRequest.shouldCallModel || combinedMatches.length > 0

      if (!shouldCallModel || combinedMatches.length === 0) {
        const refusalResponse = BlogChatResponseSchema.parse(
          buildRefusalResponse(
            resolvedChatRequest.refusalReason ?? 'insufficient_search_match',
          ),
        )

        return buildLoggedResult({
          locale,
          responseData: refusalResponse,
          requestStartedAt,
          chatObservabilityState,
        })
      }

      const responseData = buildResponseWithFollowUpSuggestions({
        locale,
        responseData: await buildModelBackedResponse({
          question: resolvedQuestion,
          matches: combinedMatches,
        }),
        matches: combinedMatches,
      })

      cacheResponseIfNeeded({
        cacheKey,
        responseData,
      })
      await storeSemanticCachedBlogChatResponse({
        locale,
        question: resolvedQuestion,
        currentPostSlug: parsedRequest.data.currentPostSlug,
        response: responseData,
      })

      return buildLoggedResult({
        locale,
        responseData,
        requestStartedAt,
        chatObservabilityState,
      })
    } finally {
      releaseBlogChatConcurrentRequestSlot({
        clientKey,
      })
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
