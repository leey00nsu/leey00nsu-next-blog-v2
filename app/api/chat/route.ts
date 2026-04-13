import { NextRequest, NextResponse } from 'next/server'
import { GENERATED_BLOG_SEARCH_RECORDS } from '@/entities/post/config/blog-search-records.generated'
import { answerBlogQuestion } from '@/features/chat/api/answer-blog-question'
import { planChatQuestion } from '@/features/chat/api/plan-chat-question'
import { BLOG_CHAT } from '@/features/chat/config/constants'
import { shouldCacheBlogChatResponse } from '@/features/chat/lib/blog-chat-cache'
import { finalizeBlogChatResponse } from '@/features/chat/lib/blog-chat-response'
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
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import type { ChatQuestionPlan } from '@/features/chat/model/chat-question-plan'
import { runChatRagWorkflow } from '@/features/chat/model/chat-rag-workflow'
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

const blogChatResponseCache = new Map<string, CachedBlogChatResponse>()
const blogChatDailyUsageMap = new Map<string, number>()

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
  cacheKey: string
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

  const validatedResponse = BlogChatResponseSchema.parse(responseData)

  if (shouldCacheBlogChatResponse(validatedResponse)) {
    blogChatResponseCache.set(params.cacheKey, {
      createdAt: Date.now(),
      data: validatedResponse,
    })
  }

  return validatedResponse
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
    const assistantProfile = getChatAssistantProfile(locale)
    const contactProfile = getChatContactProfile(locale)
    const questionPlan = await planChatQuestion({
      question: originalQuestion,
      locale,
      conversationHistory: parsedRequest.data.conversationHistory,
      currentPostSlug: parsedRequest.data.currentPostSlug,
      assistantProfile,
    })
    const resolvedQuestion = questionPlan.standaloneQuestion
    const normalizedQuestion = normalizeQuestion(resolvedQuestion)
    const cacheKey = buildCacheKey(
      normalizedQuestion,
      locale,
      parsedRequest.data.currentPostSlug,
    )
    const cachedResponse = blogChatResponseCache.get(cacheKey)

    if (cachedResponse) {
      return NextResponse.json(cachedResponse.data)
    }

    if (questionPlan.deterministicAction === 'social_reply') {
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

      return NextResponse.json(socialReplyResponse)
    }

    if (questionPlan.needsClarification) {
      const clarificationResponse = BlogChatResponseSchema.parse(
        buildClarificationResponse({
          locale,
          questionPlan,
        }),
      )

      cacheResponseIfNeeded({
        cacheKey,
        responseData: clarificationResponse,
      })

      return NextResponse.json(clarificationResponse)
    }

    const resolvedQuestionBaseAnalysis = analyzeQuestion(
      resolvedQuestion,
      locale,
    )
    const resolvedQuestionAnalysis = applyQuestionPlanToAnalysis({
      questionAnalysis: resolvedQuestionBaseAnalysis,
      questionPlan,
      locale,
    })
    const questionRouting = buildQuestionRoutingFromPlan(questionPlan)
    const plannerCurrentPostSlug = resolvePlannerCurrentPostSlug({
      questionPlan,
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

    if (resolvedChatRequest.directResponse) {
      const validatedDirectResponse = BlogChatResponseSchema.parse(
        resolvedChatRequest.directResponse,
      )

      cacheResponseIfNeeded({
        cacheKey,
        responseData: validatedDirectResponse,
      })

      return NextResponse.json(validatedDirectResponse)
    }

    const preferredSourceCategories = collectPreferredSourceCategories(
      resolvedQuestionAnalysis,
    )
    let combinedMatches = resolvedChatRequest.matches

    if (shouldRunHybridRetrieval(questionPlan)) {
      const chatRagSearchResult = await runChatRagWorkflow({
        question: resolvedQuestion,
        locale,
        currentPostSlug: plannerCurrentPostSlug,
      })

      combinedMatches = fuseChatRetrievalMatches({
        lexicalMatches: resolvedChatRequest.matches,
        semanticMatches: chatRagSearchResult.matches,
        preferredSourceCategories,
        currentPostSlug: plannerCurrentPostSlug,
      })
    }

    const shouldCallModel =
      resolvedChatRequest.shouldCallModel || combinedMatches.length > 0

    if (!shouldCallModel || combinedMatches.length === 0) {
      const refusalResponse = buildRefusalResponse(
        resolvedChatRequest.refusalReason ?? 'insufficient_search_match',
      )

      return NextResponse.json(BlogChatResponseSchema.parse(refusalResponse))
    }

    const responseData = await buildModelBackedResponse({
      question: resolvedQuestion,
      matches: combinedMatches,
      cacheKey,
    })

    return NextResponse.json(responseData)
  } catch {
    return NextResponse.json(
      {
        error: '답변을 준비하는 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.',
      },
      { status: 500 },
    )
  }
}
