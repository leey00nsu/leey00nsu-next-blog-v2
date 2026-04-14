import { NextRequest, NextResponse } from 'next/server'
import { GENERATED_BLOG_SEARCH_RECORDS } from '@/entities/post/config/blog-search-records.generated'
import { answerBlogQuestion } from '@/features/chat/api/answer-blog-question'
import { planChatQuestion } from '@/features/chat/api/plan-chat-question'
import { rerankChatEvidence } from '@/features/chat/api/rerank-chat-evidence'
import { BLOG_CHAT } from '@/features/chat/config/constants'
import { shouldCacheBlogChatResponse } from '@/features/chat/lib/blog-chat-cache'
import { finalizeBlogChatResponse } from '@/features/chat/lib/blog-chat-response'
import { buildFollowUpSuggestions } from '@/features/chat/lib/build-follow-up-suggestions'
import { fuseChatRetrievalMatches } from '@/features/chat/lib/chat-retrieval-fusion'
import { consumeDailyUsage } from '@/features/chat/lib/daily-chat-usage'
import {
  applyQuestionPlanToAnalysis,
  buildQuestionRoutingFromPlan,
  resolvePlannerCurrentPostSlug,
  shouldRunHybridRetrieval,
} from '@/features/chat/lib/chat-question-plan-routing'
import {
  analyzeQuestion,
  normalizeQuestion,
  type ChatQuestionAnalysis,
} from '@/features/chat/lib/question-analysis'
import { resolveChatRequest } from '@/features/chat/lib/resolve-chat-request'
import { shouldRerankChatEvidence } from '@/features/chat/lib/should-rerank-chat-evidence'
import {
  acquireChatConcurrentRequestSlot,
  consumeChatRequestRateLimit,
  releaseChatConcurrentRequestSlot,
  resolveChatClientKey,
} from '@/features/chat/lib/chat-rate-limit'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import type { ChatQuestionPlan } from '@/features/chat/model/chat-question-plan'
import { recordChatObservabilityEvent } from '@/features/chat/model/chat-observability'
import { runChatRagWorkflow } from '@/features/chat/model/chat-rag-workflow'
import {
  findSemanticCachedBlogChatResponse,
  storeSemanticCachedBlogChatResponse,
} from '@/features/chat/model/chat-semantic-cache'
import { getChatAssistantProfile } from '@/features/chat/model/get-chat-assistant-profile'
import { getChatContactProfile } from '@/features/chat/model/get-chat-contact-profile'
import { getCuratedChatSources } from '@/features/chat/model/get-curated-chat-sources'
import {
  BlogChatRequestSchema,
  BlogChatResponseSchema,
  type BlogChatResponse,
} from '@/features/chat/model/chat-schema'
import { LOCALES } from '@/shared/config/constants'

export const runtime = 'nodejs'

interface CachedBlogChatResponse {
  createdAt: number
  data: BlogChatResponse
}

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

const blogChatResponseCache = new Map<string, CachedBlogChatResponse>()
const blogChatDailyUsageMap = new Map<string, number>()
const blogChatRateLimitUsageMap = new Map<string, number[]>()
const blogChatInFlightMap = new Map<string, number>()

const CHAT_ROUTE = {
  FALLBACK_SOCIAL_REPLIES: {
    ko: '안녕하세요. 무엇을 찾고 계신가요?',
    en: 'Hi there. What are you looking for?',
  },
  FALLBACK_CLARIFICATION_QUESTIONS: {
    ko: '누구를 가리키는지 조금 더 구체적으로 적어주세요.',
    en: 'Please clarify who you mean a bit more specifically.',
  },
} as const

function buildCacheKey(
  normalizedQuestion: string,
  locale: string,
  currentPostSlug?: string,
): string {
  return `${locale}:${currentPostSlug ?? 'global'}:${normalizedQuestion}`
}

function buildBlogEvidenceRecords(locale: string): ChatEvidenceRecord[] {
  return (
    GENERATED_BLOG_SEARCH_RECORDS[
      locale as keyof typeof GENERATED_BLOG_SEARCH_RECORDS
    ] ?? []
  ).map((record) => {
    return {
      ...record,
      sourceCategory: 'blog' as const,
    }
  })
}

function cleanupExpiredCache(): void {
  const now = Date.now()

  for (const [cacheKey, cacheEntry] of blogChatResponseCache.entries()) {
    if (now - cacheEntry.createdAt > BLOG_CHAT.CACHE.TTL_MILLISECONDS) {
      blogChatResponseCache.delete(cacheKey)
    }
  }
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

  blogChatResponseCache.set(params.cacheKey, {
    createdAt: Date.now(),
    data: params.responseData,
  })
}

function buildSocialReplyResponse(params: {
  locale: string
  assistantProfile: ReturnType<typeof getChatAssistantProfile>
}): BlogChatResponse {
  return {
    answer:
      params.assistantProfile?.greetingAnswer ??
      CHAT_ROUTE.FALLBACK_SOCIAL_REPLIES[
        params.locale as keyof typeof CHAT_ROUTE.FALLBACK_SOCIAL_REPLIES
      ] ??
      CHAT_ROUTE.FALLBACK_SOCIAL_REPLIES[LOCALES.DEFAULT],
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
      CHAT_ROUTE.FALLBACK_CLARIFICATION_QUESTIONS[
        params.locale as keyof typeof CHAT_ROUTE.FALLBACK_CLARIFICATION_QUESTIONS
      ] ??
      CHAT_ROUTE.FALLBACK_CLARIFICATION_QUESTIONS[LOCALES.DEFAULT],
    citations: [],
    grounded: false,
  }
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

function buildPlannerFailureResponse(
  refusalReason: Extract<
    BlogChatResponse['refusalReason'],
    'missing_api_key' | 'model_error'
  >,
): BlogChatResponse {
  return buildRefusalResponse(refusalReason)
}

function buildResponseWithFollowUpSuggestions(params: {
  locale: string
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
      locale: params.locale as (typeof LOCALES.SUPPORTED)[number],
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

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json()
    const parsedRequest = BlogChatRequestSchema.safeParse(requestBody)

    if (!parsedRequest.success) {
      if (
        typeof requestBody?.question === 'string' &&
        requestBody.question.trim().length >
          BLOG_CHAT.INPUT.MAXIMUM_QUESTION_CHARACTERS
      ) {
        return NextResponse.json(
          BlogChatResponseSchema.parse(
            buildRefusalResponse('question_too_long'),
          ),
        )
      }

      return NextResponse.json(
        {
          error:
            '요청 내용을 확인하는 중 문제가 있었어요. 입력한 내용을 한 번만 다시 확인해주세요.',
          details: parsedRequest.error.flatten(),
        },
        { status: 400 },
      )
    }

    const clientKey = resolveChatClientKey(request.headers)
    const rateLimitResult = consumeChatRequestRateLimit({
      usageMap: blogChatRateLimitUsageMap,
      clientKey,
      windowMilliseconds: BLOG_CHAT.RATE_LIMIT.WINDOW_MILLISECONDS,
      maximumRequestsPerWindow:
        BLOG_CHAT.RATE_LIMIT.MAXIMUM_REQUESTS_PER_WINDOW,
    })

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        BlogChatResponseSchema.parse(buildRefusalResponse('rate_limited')),
      )
    }

    const concurrentRequestResult = acquireChatConcurrentRequestSlot({
      inFlightMap: blogChatInFlightMap,
      clientKey,
      maximumConcurrentRequests:
        BLOG_CHAT.RATE_LIMIT.MAXIMUM_CONCURRENT_REQUESTS,
    })

    if (!concurrentRequestResult.allowed) {
      return NextResponse.json(
        BlogChatResponseSchema.parse(buildRefusalResponse('rate_limited')),
      )
    }

    try {
      const requestStartedAt = Date.now()
      const dailyUsageResult = consumeDailyUsage({
        usageMap: blogChatDailyUsageMap,
        maximumDailyRequests: BLOG_CHAT.LIMIT.MAXIMUM_DAILY_REQUESTS,
      })

      if (!dailyUsageResult.allowed) {
        return NextResponse.json(
          BlogChatResponseSchema.parse(
            buildRefusalResponse('daily_limit_exceeded'),
          ),
        )
      }

      cleanupExpiredCache()

      const locale = parsedRequest.data.locale ?? LOCALES.DEFAULT
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
      async function logChatObservability(responseData: BlogChatResponse) {
        await recordChatObservabilityEvent({
          locale,
          originalQuestion: chatObservabilityState.originalQuestion,
          resolvedQuestion: chatObservabilityState.resolvedQuestion,
          normalizedQuestion: chatObservabilityState.normalizedQuestion,
          currentPostSlug: chatObservabilityState.currentPostSlug,
          cacheKind: chatObservabilityState.cacheKind,
          reranked: chatObservabilityState.reranked,
          plannerReason: chatObservabilityState.plannerReason,
          plannerAction: chatObservabilityState.plannerAction,
          plannerRetrievalMode: chatObservabilityState.plannerRetrievalMode,
          plannerDeterministicAction:
            chatObservabilityState.plannerDeterministicAction,
          preferredSourceCategories:
            chatObservabilityState.preferredSourceCategories,
          additionalKeywords: chatObservabilityState.additionalKeywords,
          lexicalMatches: summarizeMatches(
            chatObservabilityState.lexicalMatches,
          ),
          semanticMatches: summarizeMatches(
            chatObservabilityState.semanticMatches,
          ),
          finalMatches: summarizeMatches(chatObservabilityState.finalMatches),
          citations: responseData.citations.map((citation) => {
            return {
              url: citation.url,
              title: citation.title,
              sourceCategory: citation.sourceCategory,
            }
          }),
          grounded: responseData.grounded,
          refusalReason: responseData.refusalReason ?? null,
          durationMilliseconds: Date.now() - requestStartedAt,
        })
      }
      async function buildLoggedJsonResponse(responseData: BlogChatResponse) {
        try {
          await logChatObservability(responseData)
        } catch (error) {
          console.error('Failed to record chat observability event.', error)
        }

        return NextResponse.json(BlogChatResponseSchema.parse(responseData))
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

        return buildLoggedJsonResponse(plannerFailureResponse)
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
      const cachedResponse = blogChatResponseCache.get(cacheKey)

      if (cachedResponse) {
        chatObservabilityState.cacheKind = 'exact'

        return buildLoggedJsonResponse(cachedResponse.data)
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

        return buildLoggedJsonResponse(socialReplyResponse)
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

        return buildLoggedJsonResponse(clarificationResponse)
      }

      const semanticCachedResponse = await findSemanticCachedBlogChatResponse({
        locale,
        question: resolvedQuestion,
        currentPostSlug: parsedRequest.data.currentPostSlug,
      })

      if (semanticCachedResponse) {
        chatObservabilityState.cacheKind = 'semantic'

        return buildLoggedJsonResponse(semanticCachedResponse)
      }

      const resolvedQuestionBaseAnalysis = analyzeQuestion(
        resolvedQuestion,
        locale,
      )
      const resolvedQuestionAnalysis = applyQuestionPlanToAnalysis({
        questionAnalysis: resolvedQuestionBaseAnalysis,
        questionPlan: questionPlan.questionPlan,
        locale,
      })
      const questionRouting = buildQuestionRoutingFromPlan(
        questionPlan.questionPlan,
      )
      const plannerCurrentPostSlug = resolvePlannerCurrentPostSlug({
        questionPlan: questionPlan.questionPlan,
        currentPostSlug: parsedRequest.data.currentPostSlug,
      })

      const blogRecords = buildBlogEvidenceRecords(locale)
      const curatedRecords = await getCuratedChatSources(locale)
      const resolvedChatRequest = resolveChatRequest({
        question: resolvedQuestion,
        locale,
        blogRecords,
        curatedRecords,
        currentPostSlug: plannerCurrentPostSlug,
        questionAnalysis: resolvedQuestionAnalysis,
        contactProfile,
        questionRouting,
      })
      chatObservabilityState.lexicalMatches = resolvedChatRequest.matches

      if (resolvedChatRequest.directResponse) {
        const validatedDirectResponse = buildResponseWithFollowUpSuggestions({
          locale,
          responseData: BlogChatResponseSchema.parse(
            resolvedChatRequest.directResponse,
          ),
          matches: resolvedChatRequest.matches,
        })
        chatObservabilityState.finalMatches = resolvedChatRequest.matches

        cacheResponseIfNeeded({
          cacheKey,
          responseData: validatedDirectResponse,
        })

        return buildLoggedJsonResponse(validatedDirectResponse)
      }

      const preferredSourceCategories = collectPreferredSourceCategories(
        resolvedQuestionAnalysis,
      )
      let combinedMatches = resolvedChatRequest.matches
      let semanticMatches: ChatEvidenceRecord[] = []

      if (shouldRunHybridRetrieval(questionPlan.questionPlan)) {
        const chatRagSearchResult = await runChatRagWorkflow({
          question: resolvedQuestion,
          locale,
          currentPostSlug: plannerCurrentPostSlug,
        })
        semanticMatches = chatRagSearchResult.matches
        chatObservabilityState.semanticMatches = semanticMatches

        combinedMatches = fuseChatRetrievalMatches({
          lexicalMatches: resolvedChatRequest.matches,
          semanticMatches,
          preferredSourceCategories,
          currentPostSlug: plannerCurrentPostSlug,
        })
      }

      if (
        shouldRerankChatEvidence({
          question: resolvedQuestion,
          conversationHistoryCount:
            parsedRequest.data.conversationHistory.length,
          matchCount: combinedMatches.length,
          questionPlan: questionPlan.questionPlan,
        })
      ) {
        combinedMatches = await rerankChatEvidence({
          question: resolvedQuestion,
          matches: combinedMatches,
        })
        chatObservabilityState.reranked = true
      }
      chatObservabilityState.finalMatches = combinedMatches

      const shouldCallModel =
        resolvedChatRequest.shouldCallModel || combinedMatches.length > 0

      if (!shouldCallModel || combinedMatches.length === 0) {
        const refusalResponse = buildRefusalResponse(
          resolvedChatRequest.refusalReason ?? 'insufficient_search_match',
        )

        return buildLoggedJsonResponse(
          BlogChatResponseSchema.parse(refusalResponse),
        )
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

      return buildLoggedJsonResponse(responseData)
    } finally {
      releaseChatConcurrentRequestSlot({
        inFlightMap: blogChatInFlightMap,
        clientKey,
      })
    }
  } catch {
    return NextResponse.json(
      {
        error: '답변을 준비하는 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.',
      },
      { status: 500 },
    )
  }
}
