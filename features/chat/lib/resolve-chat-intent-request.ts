import { BLOG_CHAT } from '@/features/chat/config/constants'
import { selectEvidenceCoveringRequiredConcepts } from '@/features/chat/lib/chat-required-concepts'
import { selectChatSearchMatches } from '@/features/chat/lib/chat-search'
import { analyzeQuestion } from '@/features/chat/lib/question-analysis'
import type { ChatContactProfile } from '@/features/chat/model/chat-contact'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import type { NormalizedChatIntent } from '@/features/chat/model/chat-intent'
import type { BlogChatResponse } from '@/features/chat/model/chat-schema'
import type { SupportedLocale } from '@/shared/config/constants'

interface ResolveChatIntentRequestParams {
  intent: NormalizedChatIntent
  locale: SupportedLocale
  blogRecords: ChatEvidenceRecord[]
  curatedRecords: ChatEvidenceRecord[]
  currentPostSlug?: string
  contactProfile?: ChatContactProfile | null
}

export interface ResolveChatIntentRequestResult {
  normalizedQuestion: string
  questionType: 'general' | 'recommendation' | 'retrospect'
  shouldCallModel: boolean
  matches: ChatEvidenceRecord[]
  directResponse?: BlogChatResponse
  refusalReason?: 'insufficient_search_match'
}

const INTENT_CHAT_RESPONSES = {
  ko: {
    LATEST_TITLE: '최신 글은 {title}입니다.',
    LATEST_TITLE_WITH_DATE: '최신 글은 {publishedAt}에 게시된 {title}입니다.',
    OLDEST_TITLE: '가장 오래된 글은 {title}입니다.',
    OLDEST_TITLE_WITH_DATE:
      '가장 오래된 글은 {publishedAt}에 게시된 {title}입니다.',
    CONTACT_INTRO: '공개된 연락 채널은 다음과 같습니다.',
    CONTACT_OUTRO: '자세한 정보는 소개 페이지에서 확인할 수 있어요.',
  },
  en: {
    LATEST_TITLE: 'The latest post is {title}.',
    LATEST_TITLE_WITH_DATE:
      'The latest post is {title}, published on {publishedAt}.',
    OLDEST_TITLE: 'The oldest post is {title}.',
    OLDEST_TITLE_WITH_DATE:
      'The oldest post is {title}, published on {publishedAt}.',
    CONTACT_INTRO: 'The public contact channels are:',
    CONTACT_OUTRO: 'You can find the details on the About page.',
  },
} as const

function formatPublishedAt(
  publishedAt: string | null | undefined,
  locale: SupportedLocale,
): string {
  if (!publishedAt) {
    return ''
  }

  const publishedAtDate = new Date(publishedAt)

  if (Number.isNaN(publishedAtDate.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(publishedAtDate)
}

function selectChronologicalRecord(params: {
  order: NormalizedChatIntent['temporalConstraint']['order']
  blogRecords: ChatEvidenceRecord[]
}): ChatEvidenceRecord | undefined {
  if (params.order === 'none') {
    return undefined
  }

  const uniqueRecordMap = new Map<string, ChatEvidenceRecord>()

  for (const record of params.blogRecords) {
    if (
      record.sourceCategory === 'blog' &&
      record.publishedAt &&
      !uniqueRecordMap.has(record.slug)
    ) {
      uniqueRecordMap.set(record.slug, record)
    }
  }

  return [...uniqueRecordMap.values()].sort((leftRecord, rightRecord) => {
    const timeDifference =
      new Date(rightRecord.publishedAt ?? 0).getTime() -
      new Date(leftRecord.publishedAt ?? 0).getTime()

    return params.order === 'latest' ? timeDifference : -timeDifference
  })[0]
}

function buildChronologicalResponse(params: {
  intent: NormalizedChatIntent
  locale: SupportedLocale
  record: ChatEvidenceRecord
}): BlogChatResponse {
  const isLatest = params.intent.temporalConstraint.order === 'latest'
  const includesPublishedAt =
    params.intent.requestedFields.includes('published_at')
  const responses = INTENT_CHAT_RESPONSES[params.locale]
  const template = isLatest
    ? includesPublishedAt
      ? responses.LATEST_TITLE_WITH_DATE
      : responses.LATEST_TITLE
    : includesPublishedAt
      ? responses.OLDEST_TITLE_WITH_DATE
      : responses.OLDEST_TITLE

  return {
    answer: template
      .replace('{title}', params.record.title)
      .replace(
        '{publishedAt}',
        formatPublishedAt(params.record.publishedAt, params.locale),
      ),
    grounded: true,
    citations: [
      {
        title: params.record.title,
        url: params.record.url,
        sectionTitle: params.record.sectionTitle,
        sourceCategory: params.record.sourceCategory,
      },
    ],
  }
}

function buildContactResponse(params: {
  locale: SupportedLocale
  contactProfile?: ChatContactProfile | null
}): BlogChatResponse | undefined {
  if (!params.contactProfile || params.contactProfile.methods.length === 0) {
    return undefined
  }

  const responses = INTENT_CHAT_RESPONSES[params.locale]

  return {
    answer: [
      responses.CONTACT_INTRO,
      ...params.contactProfile.methods.map((contactMethod) => {
        return `- ${contactMethod.label}: ${contactMethod.url}`
      }),
      '',
      responses.CONTACT_OUTRO,
    ].join('\n'),
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

function buildCurrentSourceMatches(params: {
  intent: NormalizedChatIntent
  currentPostSlug?: string
  blogRecords: ChatEvidenceRecord[]
}): ChatEvidenceRecord[] {
  if (params.intent.evidenceScope !== 'current_source') {
    return []
  }

  const targetSlug = params.intent.target.slug ?? params.currentPostSlug

  if (!targetSlug) {
    return []
  }

  return params.blogRecords
    .filter((record) => {
      return record.sourceCategory === 'blog' && record.slug === targetSlug
    })
    .slice(0, BLOG_CHAT.SEARCH.TOP_K)
}

function mergeUniqueMatches(
  matchGroups: ChatEvidenceRecord[][],
): ChatEvidenceRecord[] {
  const matchMap = new Map<string, ChatEvidenceRecord>()

  for (const match of matchGroups.flat()) {
    matchMap.set(match.id, match)
  }

  return [...matchMap.values()]
}

export function resolveChatIntentRequest({
  intent,
  locale,
  blogRecords,
  curatedRecords,
  currentPostSlug,
  contactProfile,
}: ResolveChatIntentRequestParams): ResolveChatIntentRequestResult {
  const questionAnalysis = analyzeQuestion(intent.standaloneQuestion, locale)
  const baseResult = {
    normalizedQuestion: questionAnalysis.normalizedQuestion,
    questionType: questionAnalysis.questionType,
  }

  if (intent.operation === 'contact') {
    const directResponse = buildContactResponse({ locale, contactProfile })

    if (directResponse) {
      return {
        ...baseResult,
        shouldCallModel: false,
        matches: [],
        directResponse,
      }
    }
  }

  const chronologicalRecord = selectChronologicalRecord({
    order: intent.temporalConstraint.order,
    blogRecords,
  })

  if (chronologicalRecord) {
    if (
      intent.operation === 'summarize' ||
      intent.operation === 'explain' ||
      intent.operation === 'compare'
    ) {
      return {
        ...baseResult,
        shouldCallModel: true,
        matches: [chronologicalRecord],
      }
    }

    return {
      ...baseResult,
      shouldCallModel: false,
      matches: [chronologicalRecord],
      directResponse: buildChronologicalResponse({
        intent,
        locale,
        record: chronologicalRecord,
      }),
    }
  }

  const currentSourceMatches = buildCurrentSourceMatches({
    intent,
    currentPostSlug,
    blogRecords,
  })

  if (currentSourceMatches.length > 0) {
    return {
      ...baseResult,
      shouldCallModel: true,
      matches: currentSourceMatches,
    }
  }

  const searchKeywords = [
    ...intent.requiredConcepts,
    ...intent.optionalConcepts,
  ]
  const preferredSourceCategories = intent.target.sourceCategory
    ? [intent.target.sourceCategory]
    : []
  const curatedSelection = selectChatSearchMatches({
    question: intent.standaloneQuestion,
    locale,
    records: curatedRecords,
    rankingConcepts: searchKeywords,
    preferredSourceCategories,
  })
  const blogSelection = selectChatSearchMatches({
    question: intent.standaloneQuestion,
    locale,
    records: blogRecords,
    rankingConcepts: searchKeywords,
  })
  const matches = selectEvidenceCoveringRequiredConcepts({
    matches: mergeUniqueMatches([
      curatedSelection.matches,
      blogSelection.matches,
    ]),
    requiredConcepts: intent.requiredConcepts,
    locale,
  }).slice(0, BLOG_CHAT.SEARCH.TOP_K)

  if (matches.length === 0) {
    return {
      ...baseResult,
      shouldCallModel: false,
      matches: [],
      refusalReason: 'insufficient_search_match',
    }
  }

  return {
    ...baseResult,
    shouldCallModel: true,
    matches,
  }
}
