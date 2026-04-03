import { NextRequest, NextResponse } from 'next/server'
import { GENERATED_BLOG_SEARCH_RECORDS } from '@/entities/post/config/blog-search-records.generated'
import { answerBlogQuestion } from '@/features/chat/api/answer-blog-question'
import { BLOG_CHAT } from '@/features/chat/config/constants'
import { shouldCacheBlogChatResponse } from '@/features/chat/lib/blog-chat-cache'
import { finalizeBlogChatResponse } from '@/features/chat/lib/blog-chat-response'
import { consumeDailyUsage } from '@/features/chat/lib/daily-chat-usage'
import { analyzeQuestion } from '@/features/chat/lib/question-analysis'
import { resolveChatRequest } from '@/features/chat/lib/resolve-chat-request'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
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

    cleanupExpiredCache()

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

    const locale = parsedRequest.data.locale ?? LOCALES.DEFAULT
    const questionAnalysis = analyzeQuestion(parsedRequest.data.question)
    const cacheKey = buildCacheKey(
      questionAnalysis.normalizedQuestion,
      locale,
      parsedRequest.data.currentPostSlug,
    )
    const cachedResponse = blogChatResponseCache.get(cacheKey)

    if (cachedResponse) {
      return NextResponse.json(cachedResponse.data)
    }

    const curatedRecords = await getCuratedChatSources(locale)
    const resolvedChatRequest = resolveChatRequest({
      question: parsedRequest.data.question,
      locale,
      blogRecords: buildBlogEvidenceRecords(locale),
      curatedRecords,
      currentPostSlug: parsedRequest.data.currentPostSlug,
      questionAnalysis,
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

    if (!resolvedChatRequest.shouldCallModel) {
      const refusalResponse = buildRefusalResponse(
        resolvedChatRequest.refusalReason ?? 'insufficient_search_match',
      )

      return NextResponse.json(BlogChatResponseSchema.parse(refusalResponse))
    }

    const answerResult = await answerBlogQuestion({
      question: parsedRequest.data.question,
      matches: resolvedChatRequest.matches,
    })

    const responseData =
      answerResult.ok && answerResult.draftAnswer
        ? finalizeBlogChatResponse({
            draftAnswer: answerResult.draftAnswer,
            matches: resolvedChatRequest.matches,
          })
        : buildRefusalResponse(answerResult.refusalReason ?? 'model_error')

    const validatedResponse = BlogChatResponseSchema.parse(responseData)

    if (shouldCacheBlogChatResponse(validatedResponse)) {
      blogChatResponseCache.set(cacheKey, {
        createdAt: Date.now(),
        data: validatedResponse,
      })
    }

    return NextResponse.json(validatedResponse)
  } catch {
    return NextResponse.json(
      {
        error: '답변을 준비하는 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.',
      },
      { status: 500 },
    )
  }
}
