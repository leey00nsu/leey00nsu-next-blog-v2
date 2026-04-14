import { BLOG_CHAT } from '@/features/chat/config/constants'
import { selectChatSearchMatches } from '@/features/chat/lib/chat-search'
import {
  analyzeQuestion,
  type ChatQuestionAnalysis,
} from '@/features/chat/lib/question-analysis'
import type { ChatContactProfile } from '@/features/chat/model/chat-contact'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import type {
  ChatQuestionRoutingResult,
  ChatQuestionSelector,
} from '@/features/chat/model/chat-question-routing'
import type { BlogChatResponse } from '@/features/chat/model/chat-schema'
import type { SupportedLocale } from '@/shared/config/constants'

interface ResolveChatRequestParams {
  question: string
  locale: SupportedLocale
  blogRecords: ChatEvidenceRecord[]
  curatedRecords: ChatEvidenceRecord[]
  currentPostSlug?: string
  questionAnalysis?: ChatQuestionAnalysis
  contactProfile?: ChatContactProfile | null
  questionRouting?: ChatQuestionRoutingResult
}

interface ResolveChatRequestResult {
  normalizedQuestion: string
  questionType: ChatQuestionAnalysis['questionType']
  shouldCallModel: boolean
  matches: ChatEvidenceRecord[]
  directResponse?: BlogChatResponse
  refusalReason?: 'insufficient_search_match'
}

const CHRONOLOGICAL_QUERY_PATTERNS = {
  LATEST: ['최신', '최근', 'latest', 'recent'],
  OLDEST: ['오래된', '가장 오래된', '첫 글', '처음 글', 'oldest', 'first post'],
  RETROSPECT: ['회고', 'retrospect'],
} as const

const CHRONOLOGICAL_CHAT_RESPONSES = {
  ko: {
    LATEST: '최신 글은 {title}입니다.',
    OLDEST: '가장 오래된 글로는 {title}을 추천할게요.',
  },
  en: {
    LATEST: 'The latest post is {title}.',
    OLDEST: 'If you want the oldest post, I would point you to {title}.',
  },
} as const

const CONTACT_CHAT_RESPONSES = {
  ko: {
    INTRO: '공개된 연락 채널은 다음과 같습니다.',
    OUTRO: '자세한 정보는 소개 페이지에서 확인할 수 있어요.',
  },
  en: {
    INTRO: 'The public contact channels are:',
    OUTRO: 'You can find the details on the About page.',
  },
} as const

function buildDirectContactResponse(params: {
  locale: SupportedLocale
  contactProfile?: ChatContactProfile | null
}): BlogChatResponse | undefined {
  if (!params.contactProfile || params.contactProfile.methods.length === 0) {
    return undefined
  }

  const answerLines = [
    CONTACT_CHAT_RESPONSES[params.locale].INTRO,
    ...params.contactProfile.methods.map((contactMethod) => {
      return `- ${contactMethod.label}: ${contactMethod.url}`
    }),
    '',
    CONTACT_CHAT_RESPONSES[params.locale].OUTRO,
  ]

  return {
    answer: answerLines.join('\n'),
    grounded: true,
    citations: [
      {
        title: params.contactProfile.title,
        url: params.contactProfile.aboutUrl,
        sectionTitle: null,
        sourceCategory: 'profile',
      },
    ],
  }
}

function includesAnyPattern(text: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => {
    return text.includes(pattern)
  })
}

function buildUniquePublishedBlogRecords(
  blogRecords: ChatEvidenceRecord[],
): ChatEvidenceRecord[] {
  const uniqueBlogRecordMap = new Map<string, ChatEvidenceRecord>()

  for (const blogRecord of blogRecords) {
    if (blogRecord.sourceCategory !== 'blog') {
      continue
    }

    if (!blogRecord.publishedAt) {
      continue
    }

    if (uniqueBlogRecordMap.has(blogRecord.slug)) {
      continue
    }

    uniqueBlogRecordMap.set(blogRecord.slug, blogRecord)
  }

  return [...uniqueBlogRecordMap.values()]
}

function buildChronologicalBlogResponse(params: {
  locale: SupportedLocale
  selector: 'latest_post' | 'oldest_post'
  selectedBlogRecord: ChatEvidenceRecord
}): BlogChatResponse {
  const isLatestQuestion = params.selector === 'latest_post'
  const uniquePublishedBlogRecords = buildUniquePublishedBlogRecords(
    [params.selectedBlogRecord],
  )

  const answerTemplate = isLatestQuestion
    ? CHRONOLOGICAL_CHAT_RESPONSES[params.locale].LATEST
    : CHRONOLOGICAL_CHAT_RESPONSES[params.locale].OLDEST

  return {
    answer: answerTemplate.replace('{title}', params.selectedBlogRecord.title),
    grounded: true,
    citations: [
      {
        title: params.selectedBlogRecord.title,
        url: params.selectedBlogRecord.url,
        sectionTitle: params.selectedBlogRecord.sectionTitle,
        sourceCategory: params.selectedBlogRecord.sourceCategory,
      },
    ],
  }
}

function selectChronologicalBlogRecord(params: {
  selector: ChatQuestionSelector
  normalizedQuestion: string
  blogRecords: ChatEvidenceRecord[]
}): ChatEvidenceRecord | undefined {
  const isLatestQuestion =
    params.selector === 'latest_post' ||
    includesAnyPattern(
      params.normalizedQuestion,
      CHRONOLOGICAL_QUERY_PATTERNS.LATEST,
    )
  const isOldestQuestion =
    params.selector === 'oldest_post' ||
    includesAnyPattern(
      params.normalizedQuestion,
      CHRONOLOGICAL_QUERY_PATTERNS.OLDEST,
    )

  if (!isLatestQuestion && !isOldestQuestion) {
    return undefined
  }

  const uniquePublishedBlogRecords = buildUniquePublishedBlogRecords(
    params.blogRecords,
  )

  const filteredBlogRecords = includesAnyPattern(
    params.normalizedQuestion,
    CHRONOLOGICAL_QUERY_PATTERNS.RETROSPECT,
  )
    ? uniquePublishedBlogRecords.filter((blogRecord) => {
        return [
          blogRecord.title,
          blogRecord.excerpt,
          blogRecord.content,
          blogRecord.tags.join(' '),
          blogRecord.searchTerms?.join(' ') ?? '',
        ].some((searchText) => {
          return searchText.includes('회고') || searchText.includes('retrospect')
        })
      })
    : uniquePublishedBlogRecords

  return [...filteredBlogRecords].sort((previousRecord, nextRecord) => {
    const previousPublishedAt = new Date(
      previousRecord.publishedAt ?? 0,
    ).getTime()
    const nextPublishedAt = new Date(nextRecord.publishedAt ?? 0).getTime()

    return isLatestQuestion
      ? nextPublishedAt - previousPublishedAt
      : previousPublishedAt - nextPublishedAt
  })[0]
}

function buildCurrentPostMatches(params: {
  currentPostSlug?: string
  blogRecords: ChatEvidenceRecord[]
}): ChatEvidenceRecord[] {
  if (!params.currentPostSlug) {
    return []
  }

  return params.blogRecords
    .filter((blogRecord) => {
      return (
        blogRecord.slug === params.currentPostSlug &&
        blogRecord.sourceCategory === 'blog'
      )
    })
    .sort((previousRecord, nextRecord) => {
      if (previousRecord.sectionTitle === null && nextRecord.sectionTitle !== null) {
        return -1
      }

      if (previousRecord.sectionTitle !== null && nextRecord.sectionTitle === null) {
        return 1
      }

      return 0
    })
    .slice(0, BLOG_CHAT.SEARCH.TOP_K)
}

function resolveCurrentPostSearchSlug(params: {
  selector: ChatQuestionSelector | undefined
  currentPostSlug?: string
}): string | undefined {
  if (params.selector !== 'current_post') {
    return undefined
  }

  return params.currentPostSlug
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

  const mergedMatches = [...mergedMatchMap.values()]
  const prioritizedMatches = prioritizeBlogEvidence(mergedMatches)

  return prioritizedMatches.slice(0, BLOG_CHAT.SEARCH.TOP_K)
}

function prioritizeBlogEvidence(
  matches: ChatEvidenceRecord[],
): ChatEvidenceRecord[] {
  const firstBlogMatch = matches.find((match) => {
    return match.sourceCategory === 'blog'
  })
  const hasNonBlogMatch = matches.some((match) => {
    return match.sourceCategory !== 'blog'
  })

  if (!firstBlogMatch || !hasNonBlogMatch) {
    return matches
  }

  const prioritizedMatches: ChatEvidenceRecord[] = [matches[0]]

  if (firstBlogMatch.url !== matches[0]?.url) {
    prioritizedMatches.push(firstBlogMatch)
  }

  for (const match of matches) {
    if (
      prioritizedMatches.some((prioritizedMatch) => {
        return prioritizedMatch.url === match.url
      })
    ) {
      continue
    }

    prioritizedMatches.push(match)
  }

  return prioritizedMatches
}

export function resolveChatRequest({
  question,
  locale,
  blogRecords,
  curatedRecords,
  currentPostSlug,
  questionAnalysis,
  contactProfile,
  questionRouting,
}: ResolveChatRequestParams): ResolveChatRequestResult {
  const resolvedQuestionAnalysis =
    questionAnalysis ?? analyzeQuestion(question, locale)
  const resolvedQuestionRouting = questionRouting
  const selector = resolvedQuestionRouting?.selector
  const action = resolvedQuestionRouting?.action
  const currentPostSearchSlug = resolveCurrentPostSearchSlug({
    selector,
    currentPostSlug,
  })

  if (selector === 'contact') {
    const directContactResponse = buildDirectContactResponse({
      locale,
      contactProfile,
    })

    if (directContactResponse) {
      return {
        normalizedQuestion: resolvedQuestionAnalysis.normalizedQuestion,
        questionType: resolvedQuestionAnalysis.questionType,
        shouldCallModel: false,
        matches: [],
        directResponse: directContactResponse,
      }
    }
  }

  const selectedChronologicalBlogRecord = selectChronologicalBlogRecord({
    selector: selector ?? 'retrieval',
    normalizedQuestion: resolvedQuestionAnalysis.normalizedQuestion,
    blogRecords,
  })

  if (selectedChronologicalBlogRecord) {
    if (action === 'summarize' || action === 'explain' || action === 'compare') {
      return {
        normalizedQuestion: resolvedQuestionAnalysis.normalizedQuestion,
        questionType: resolvedQuestionAnalysis.questionType,
        shouldCallModel: true,
        matches: [selectedChronologicalBlogRecord],
      }
    }

    return {
      normalizedQuestion: resolvedQuestionAnalysis.normalizedQuestion,
      questionType: resolvedQuestionAnalysis.questionType,
      shouldCallModel: false,
      matches: [],
      directResponse: buildChronologicalBlogResponse({
        locale,
        selector:
          selector === 'oldest_post' ? 'oldest_post' : 'latest_post',
        selectedBlogRecord: selectedChronologicalBlogRecord,
      }),
    }
  }

  if (selector === 'current_post') {
    const currentPostMatches = buildCurrentPostMatches({
      currentPostSlug,
      blogRecords,
    })

    if (currentPostMatches.length > 0) {
      return {
        normalizedQuestion: resolvedQuestionAnalysis.normalizedQuestion,
        questionType: resolvedQuestionAnalysis.questionType,
        shouldCallModel: true,
        matches: currentPostMatches,
      }
    }
  }

  let mergedMatches: ChatEvidenceRecord[] = []

  for (const searchQuery of resolvedQuestionAnalysis.searchQueries) {
    const curatedSelection = selectChatSearchMatches({
      question: searchQuery.question,
      locale,
      records: curatedRecords,
      additionalKeywords: searchQuery.additionalKeywords,
      preferredSourceCategories: searchQuery.preferredSourceCategories,
    })
    const blogSelection = selectChatSearchMatches({
      question: searchQuery.question,
      locale,
      records: blogRecords,
      currentPostSlug: currentPostSearchSlug,
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
