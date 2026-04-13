import { NextRequest, NextResponse } from 'next/server'
import { GENERATED_BLOG_SEARCH_RECORDS } from '@/entities/post/config/blog-search-records.generated'
import { answerBlogQuestion } from '@/features/chat/api/answer-blog-question'
import { classifyChatQuestion } from '@/features/chat/api/classify-chat-question'
import { BLOG_CHAT } from '@/features/chat/config/constants'
import { shouldCacheBlogChatResponse } from '@/features/chat/lib/blog-chat-cache'
import { finalizeBlogChatResponse } from '@/features/chat/lib/blog-chat-response'
import { fuseChatRetrievalMatches } from '@/features/chat/lib/chat-retrieval-fusion'
import { consumeDailyUsage } from '@/features/chat/lib/daily-chat-usage'
import {
  analyzeQuestion,
  normalizeQuestion,
  type ChatQuestionAnalysis,
} from '@/features/chat/lib/question-analysis'
import { rewriteChatQuestionWithHistory } from '@/features/chat/lib/rewrite-chat-question'
import { resolveChatRequest } from '@/features/chat/lib/resolve-chat-request'
import type {
  ChatQuestionRoutingResult,
  ChatQuestionSelector,
} from '@/features/chat/model/chat-question-routing'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
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

function buildQuestionAnalysisOverride(params: {
  normalizedQuestion: string
  questionRouting: ChatQuestionRoutingResult
}): ChatQuestionAnalysis | undefined {
  if (params.questionRouting.selector === 'greeting') {
    return {
      normalizedQuestion: params.normalizedQuestion,
      questionType: 'greeting',
      searchQueries: [],
    }
  }

  if (params.questionRouting.selector === 'assistant_identity') {
    return {
      normalizedQuestion: params.normalizedQuestion,
      questionType: 'assistant-identity',
      searchQueries: [],
    }
  }

  return undefined
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

function shouldRewriteQuestionWithHistory(
  selector: ChatQuestionSelector,
): boolean {
  return (
    selector === 'retrieval' ||
    selector === 'corpus' ||
    selector === 'current_post'
  )
}

function shouldRunHybridRetrieval(selector: ChatQuestionSelector): boolean {
  return selector === 'retrieval' || selector === 'corpus'
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
    const originalQuestionAnalysis = analyzeQuestion(originalQuestion, locale)
    const assistantProfile = getChatAssistantProfile(locale)
    const contactProfile = getChatContactProfile(locale)
    const questionRouting = await classifyChatQuestion({
      question: originalQuestion,
      locale,
      normalizedQuestion: originalQuestionAnalysis.normalizedQuestion,
      fallbackQuestionType: originalQuestionAnalysis.questionType,
      assistantProfile,
      hasCurrentPostContext: Boolean(parsedRequest.data.currentPostSlug),
    })
    const resolvedQuestion = shouldRewriteQuestionWithHistory(
      questionRouting.selector,
    )
      ? rewriteChatQuestionWithHistory({
          question: originalQuestion,
          conversationHistory: parsedRequest.data.conversationHistory,
        })
      : originalQuestion
    const normalizedQuestion = normalizeQuestion(resolvedQuestion)
    const resolvedQuestionBaseAnalysis =
      resolvedQuestion === originalQuestion
        ? originalQuestionAnalysis
        : analyzeQuestion(resolvedQuestion, locale)
    const cacheKey = buildCacheKey(
      normalizedQuestion,
      locale,
      parsedRequest.data.currentPostSlug,
    )
    const cachedResponse = blogChatResponseCache.get(cacheKey)

    if (cachedResponse) {
      return NextResponse.json(cachedResponse.data)
    }
    const questionAnalysisOverride = buildQuestionAnalysisOverride({
      normalizedQuestion,
      questionRouting,
    })
    const resolvedQuestionAnalysis =
      questionAnalysisOverride ?? resolvedQuestionBaseAnalysis

    const blogRecords = buildBlogEvidenceRecords(locale)
    const curatedRecords = await getCuratedChatSources(locale)
    const resolvedChatRequest = resolveChatRequest({
      question: resolvedQuestion,
      locale,
      blogRecords,
      curatedRecords,
      currentPostSlug: parsedRequest.data.currentPostSlug,
      questionAnalysis: resolvedQuestionAnalysis,
      assistantProfile,
      contactProfile,
      questionRouting,
    })

    if (resolvedChatRequest.directResponse) {
      const validatedDirectResponse = BlogChatResponseSchema.parse(
        resolvedChatRequest.directResponse,
      )

      if (shouldCacheBlogChatResponse(validatedDirectResponse)) {
        blogChatResponseCache.set(cacheKey, {
          createdAt: Date.now(),
          data: validatedDirectResponse,
        })
      }

      return NextResponse.json(validatedDirectResponse)
    }

    const preferredSourceCategories = collectPreferredSourceCategories(
      resolvedQuestionAnalysis,
    )
    let combinedMatches = resolvedChatRequest.matches

    if (shouldRunHybridRetrieval(questionRouting.selector)) {
      const chatRagSearchResult = await runChatRagWorkflow({
        question: resolvedQuestion,
        locale,
        currentPostSlug: parsedRequest.data.currentPostSlug,
      })

      combinedMatches = fuseChatRetrievalMatches({
        lexicalMatches: resolvedChatRequest.matches,
        semanticMatches: chatRagSearchResult.matches,
        preferredSourceCategories,
        currentPostSlug: parsedRequest.data.currentPostSlug,
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
