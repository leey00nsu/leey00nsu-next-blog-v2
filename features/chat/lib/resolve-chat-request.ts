import { BLOG_CHAT } from '@/features/chat/config/constants'
import { selectChatSearchMatches } from '@/features/chat/lib/chat-search'
import {
  analyzeQuestion,
  type ChatQuestionAnalysis,
} from '@/features/chat/lib/question-analysis'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import type { BlogChatResponse } from '@/features/chat/model/chat-schema'
import type { SupportedLocale } from '@/shared/config/constants'

interface ResolveChatRequestParams {
  question: string
  locale: SupportedLocale
  blogRecords: ChatEvidenceRecord[]
  curatedRecords: ChatEvidenceRecord[]
  currentPostSlug?: string
  questionAnalysis?: ChatQuestionAnalysis
}

interface ResolveChatRequestResult {
  normalizedQuestion: string
  questionType: ChatQuestionAnalysis['questionType']
  shouldCallModel: boolean
  matches: ChatEvidenceRecord[]
  directResponse?: BlogChatResponse
  refusalReason?: 'insufficient_search_match'
}

const DIRECT_CHAT_RESPONSES = {
  ko: '안녕하세요. 이 챗봇은 블로그 글과 공개된 소개 페이지를 바탕으로 먼저 관련 내용을 찾아보고, 근거가 충분할 때만 답변을 정리해드려요.',
  en: 'Hi there. This chatbot looks through the blog and public profile pages first, then answers only when there is enough supporting evidence.',
} as const

function buildDirectGreetingResponse(
  locale: SupportedLocale,
): BlogChatResponse {
  return {
    answer: DIRECT_CHAT_RESPONSES[locale],
    citations: [],
    grounded: false,
  }
}

function mergeMatches(
  previousMatches: ChatEvidenceRecord[],
  nextMatches: ChatEvidenceRecord[],
): ChatEvidenceRecord[] {
  const mergedMatchMap = new Map<string, ChatEvidenceRecord>()

  for (const match of [...previousMatches, ...nextMatches]) {
    if (mergedMatchMap.has(match.url)) {
      continue
    }

    mergedMatchMap.set(match.url, match)
  }

  return [...mergedMatchMap.values()].slice(0, BLOG_CHAT.SEARCH.TOP_K)
}

export function resolveChatRequest({
  question,
  locale,
  blogRecords,
  curatedRecords,
  currentPostSlug,
  questionAnalysis,
}: ResolveChatRequestParams): ResolveChatRequestResult {
  const resolvedQuestionAnalysis = questionAnalysis ?? analyzeQuestion(question)

  if (resolvedQuestionAnalysis.questionType === 'greeting') {
    return {
      normalizedQuestion: resolvedQuestionAnalysis.normalizedQuestion,
      questionType: resolvedQuestionAnalysis.questionType,
      shouldCallModel: false,
      matches: [],
      directResponse: buildDirectGreetingResponse(locale),
    }
  }

  let mergedMatches: ChatEvidenceRecord[] = []

  for (const searchQuery of resolvedQuestionAnalysis.searchQueries) {
    const shouldSearchCuratedSources = searchQuery.intent !== 'general'
    const curatedSearchQuestion =
      searchQuery.additionalKeywords[0] ?? searchQuery.question
    const curatedSelection = shouldSearchCuratedSources
      ? selectChatSearchMatches({
          question: curatedSearchQuestion,
          locale,
          records: curatedRecords,
          additionalKeywords: searchQuery.additionalKeywords,
          preferredSourceCategories: searchQuery.preferredSourceCategories,
        })
      : {
          grounded: false,
          matches: [],
          refusalReason: 'insufficient_search_match' as const,
        }
    const blogSelection = selectChatSearchMatches({
      question: searchQuery.question,
      locale,
      records: blogRecords,
      currentPostSlug,
      additionalKeywords: searchQuery.additionalKeywords,
    })

    mergedMatches = mergeMatches(
      mergedMatches,
      [...curatedSelection.matches, ...blogSelection.matches],
    )
  }

  if (mergedMatches.length === 0) {
    return {
      normalizedQuestion: resolvedQuestionAnalysis.normalizedQuestion,
      questionType: resolvedQuestionAnalysis.questionType,
      shouldCallModel: false,
      matches: [],
      refusalReason: 'insufficient_search_match',
    }
  }

  return {
    normalizedQuestion: resolvedQuestionAnalysis.normalizedQuestion,
    questionType: resolvedQuestionAnalysis.questionType,
    shouldCallModel: true,
    matches: mergedMatches,
  }
}
