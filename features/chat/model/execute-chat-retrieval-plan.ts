import { BLOG_CHAT } from '@/features/chat/config/constants'
import {
  doesChatEvidenceMatchConcept,
  selectEvidenceCoveringRequiredConcepts,
} from '@/features/chat/lib/chat-required-concepts'
import { selectChatSearchMatches } from '@/features/chat/lib/chat-search'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import type { ChatRetrievalPlan } from '@/features/chat/model/chat-retrieval-plan'
import { runChatRagWorkflow } from '@/features/chat/model/chat-rag-workflow'
import type { BlogChatResponse } from '@/features/chat/model/chat-schema'
import type { SupportedLocale } from '@/shared/config/constants'

interface RetrieveSemanticMatchesParams {
  plan: ChatRetrievalPlan
  locale: SupportedLocale
}

type RetrieveSemanticMatches = (
  params: RetrieveSemanticMatchesParams,
) => Promise<ChatEvidenceRecord[]>

interface ExecuteChatRetrievalPlanParams {
  plan: ChatRetrievalPlan
  locale: SupportedLocale
  blogRecords: ChatEvidenceRecord[]
  curatedRecords: ChatEvidenceRecord[]
  retrieveSemanticMatches?: RetrieveSemanticMatches
}

interface DirectChatRetrievalPlanResult {
  kind: 'direct'
  response: BlogChatResponse
  matches: ChatEvidenceRecord[]
}

interface EvidenceChatRetrievalPlanResult {
  kind: 'evidence'
  matches: ChatEvidenceRecord[]
  lexicalMatches: ChatEvidenceRecord[]
  semanticMatches: ChatEvidenceRecord[]
  reranked: false
}

interface RefusedChatRetrievalPlanResult {
  kind: 'refusal'
  refusalReason: 'insufficient_search_match'
  matches: []
}

export type ExecuteChatRetrievalPlanResult =
  | DirectChatRetrievalPlanResult
  | EvidenceChatRetrievalPlanResult
  | RefusedChatRetrievalPlanResult

const DIRECT_METADATA_RESPONSES = {
  ko: {
    published: {
      latest: '가장 최근 글은 {title}이며, {date}에 게시됐습니다.',
      oldest: '가장 오래된 글은 {title}이며, {date}에 게시됐습니다.',
    },
    project_ended: {
      latest: '가장 최근에 끝난 프로젝트는 {title}이며, {date}에 완료됐습니다.',
      oldest:
        '가장 오래전에 끝난 프로젝트는 {title}이며, {date}에 완료됐습니다.',
    },
  },
  en: {
    published: {
      latest: 'The latest post is {title}, published on {date}.',
      oldest: 'The oldest post is {title}, published on {date}.',
    },
    project_ended: {
      latest:
        'The most recently completed project is {title}, completed on {date}.',
      oldest: 'The earliest completed project is {title}, completed on {date}.',
    },
  },
} as const

const STRUCTURED_PROFILE_RESPONSE = {
  ko: {
    recentCareerPattern:
      /(?:최근|최신|마지막|어디(?:에서)?\s*(?:일|근무)|경력|직장|근무처)/u,
    recentCareerAnswer:
      '가장 최근 근무처는 {workplace}이며, {startDate}부터 {endDate}까지 근무했습니다.',
    careerSection: 'Career',
    educationPattern: /학력|학교별/u,
    experiencePattern: /대외\s*활동|동아리/u,
    educationHeading: '학력은 다음과 같습니다.',
    experienceHeading: '대외활동과 동아리 경험은 다음과 같습니다.',
    educationSection: 'Education',
    experienceSection: 'Experience',
  },
  en: {
    recentCareerPattern:
      /recent|latest|last\s+(?:job|workplace)|where\s+did.+work/iu,
    recentCareerAnswer:
      'The most recent workplace was {workplace}, from {startDate} to {endDate}.',
    careerSection: 'Career',
    educationPattern: /education|school|university/iu,
    experiencePattern: /extracurricular|club\s+experience/iu,
    educationHeading: 'Education:',
    experienceHeading: 'Extracurricular and club experience:',
    educationSection: 'Education',
    experienceSection: 'Experience',
  },
} as const

const PROFILE_PERIOD = {
  PATTERN: /(\d{4}\.\d{2})\s+(\d{4}\.\d{2}|present|현재)/iu,
} as const

const TECH_STACK_PROFILE_RESPONSE = {
  SOURCE_IDENTIFIER_SUFFIX: '/about/profile-tech-stack',
  ko: {
    questionPattern: /주력\s*기술|기술\s*스택|주로\s*쓰는\s*기술/u,
    contentLabel: '공통/반복 기술:',
    answerPrefix: '프로젝트에서 반복적으로 사용한 주력 기술은',
    answerSuffix: '입니다.',
  },
  en: {
    questionPattern: /primary\s+tech|tech(?:nology)?\s+stack|main\s+technologies/iu,
    contentLabel: 'Common/repeated technologies:',
    answerPrefix: 'The primary technologies used repeatedly across projects are',
    answerSuffix: '.',
  },
} as const

function resolveEvidenceTimestamp(record: ChatEvidenceRecord): number {
  const timestampValue = record.evidenceTime?.value ?? record.publishedAt

  if (!timestampValue) {
    return 0
  }

  const timestamp = new Date(timestampValue).getTime()

  return Number.isNaN(timestamp) ? 0 : timestamp
}

function recordMatchesSourcePlan(
  record: ChatEvidenceRecord,
  plan: ChatRetrievalPlan,
): boolean {
  return (
    plan.sourceStrategy !== 'only' ||
    plan.sourceCategories.includes(record.sourceCategory)
  )
}

function recordMatchesTargetPlan(
  record: ChatEvidenceRecord,
  plan: ChatRetrievalPlan,
): boolean {
  if (plan.canonicalTargets.length === 0) {
    return true
  }

  const hasStrictTarget =
    plan.sourceStrategy === 'only' ||
    plan.canonicalTargets.some((target) => {
      return target.kind === 'current_source'
    })

  if (!hasStrictTarget) {
    return true
  }

  return plan.canonicalTargets.some((target) => {
    return (
      target.slug === record.slug &&
      target.sourceCategory === record.sourceCategory
    )
  })
}

function filterRecordsByPlan(
  records: ChatEvidenceRecord[],
  plan: ChatRetrievalPlan,
): ChatEvidenceRecord[] {
  return records.filter((record) => {
    return (
      recordMatchesSourcePlan(record, plan) &&
      recordMatchesTargetPlan(record, plan)
    )
  })
}

function mergeUniqueMatches(
  matchGroups: ChatEvidenceRecord[][],
): ChatEvidenceRecord[] {
  const matchMap = new Map<string, ChatEvidenceRecord>()

  for (const match of matchGroups.flat()) {
    if (!matchMap.has(match.id)) {
      matchMap.set(match.id, match)
    }
  }

  return [...matchMap.values()]
}

function sortMatchesByPlan(
  matches: ChatEvidenceRecord[],
  plan: ChatRetrievalPlan,
): ChatEvidenceRecord[] {
  const preferredCategorySet = new Set(
    plan.sourceStrategy === 'prefer' ? plan.sourceCategories : [],
  )

  return matches.toSorted((leftMatch, rightMatch) => {
    const requiredConceptDifference =
      plan.requiredConcepts.filter((requiredConcept) => {
        return doesChatEvidenceMatchConcept(rightMatch, requiredConcept)
      }).length -
      plan.requiredConcepts.filter((requiredConcept) => {
        return doesChatEvidenceMatchConcept(leftMatch, requiredConcept)
      }).length

    if (requiredConceptDifference !== 0) {
      return requiredConceptDifference
    }

    const sourcePreferenceDifference =
      Number(preferredCategorySet.has(rightMatch.sourceCategory)) -
      Number(preferredCategorySet.has(leftMatch.sourceCategory))

    if (sourcePreferenceDifference !== 0) {
      return sourcePreferenceDifference
    }

    if (plan.temporalStrategy === 'none') {
      return 0
    }

    const timeDifference =
      resolveEvidenceTimestamp(rightMatch) - resolveEvidenceTimestamp(leftMatch)

    return plan.temporalOrder === 'oldest' ? -timeDifference : timeDifference
  })
}

function limitMatchesWithDiversity(
  matches: ChatEvidenceRecord[],
  maximumEvidenceCount: number,
  maximumMatchesPerSlug: number,
): ChatEvidenceRecord[] {
  const slugCountMap = new Map<string, number>()
  const selectedMatches: ChatEvidenceRecord[] = []

  for (const match of matches) {
    const slugMatchCount = slugCountMap.get(match.slug) ?? 0

    if (slugMatchCount >= maximumMatchesPerSlug) {
      continue
    }

    slugCountMap.set(match.slug, slugMatchCount + 1)
    selectedMatches.push(match)

    if (selectedMatches.length >= maximumEvidenceCount) {
      break
    }
  }

  return selectedMatches
}

function selectSingleDocumentMatches(
  matches: ChatEvidenceRecord[],
  maximumEvidenceCount: number,
): ChatEvidenceRecord[] {
  const selectedSlug = matches[0]?.slug

  if (!selectedSlug) {
    return []
  }

  return matches
    .filter((match) => {
      return match.slug === selectedSlug
    })
    .slice(0, maximumEvidenceCount)
}

function formatEvidenceDate(
  record: ChatEvidenceRecord,
  locale: SupportedLocale,
): string {
  const timestampValue = record.evidenceTime?.value ?? record.publishedAt

  if (!timestampValue) {
    return ''
  }

  return new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(timestampValue))
}

function buildDirectMetadataResult(params: {
  plan: ChatRetrievalPlan
  locale: SupportedLocale
  records: ChatEvidenceRecord[]
}): DirectChatRetrievalPlanResult | RefusedChatRetrievalPlanResult {
  const uniqueDocumentMap = new Map<string, ChatEvidenceRecord>()

  for (const record of params.records) {
    if (!uniqueDocumentMap.has(record.slug)) {
      uniqueDocumentMap.set(record.slug, record)
    }
  }

  const selectedRecord = sortMatchesByPlan(
    [...uniqueDocumentMap.values()],
    params.plan,
  )[0]

  if (!selectedRecord) {
    return {
      kind: 'refusal',
      refusalReason: 'insufficient_search_match',
      matches: [],
    }
  }

  const temporalOrder = params.plan.temporalOrder ?? 'latest'
  const responseKind =
    selectedRecord.evidenceTime?.kind === 'project_ended'
      ? 'project_ended'
      : 'published'
  const responseTemplate =
    DIRECT_METADATA_RESPONSES[params.locale][responseKind][temporalOrder]
  const answer = responseTemplate
    .replace('{title}', selectedRecord.title)
    .replace('{date}', formatEvidenceDate(selectedRecord, params.locale))

  return {
    kind: 'direct',
    response: {
      answer,
      grounded: true,
      citations: [
        {
          title: selectedRecord.title,
          url: selectedRecord.url,
          sectionTitle: selectedRecord.sectionTitle,
          sourceCategory: selectedRecord.sourceCategory,
        },
      ],
    },
    matches: [selectedRecord],
  }
}

function buildStructuredProfileResult(params: {
  plan: ChatRetrievalPlan
  locale: SupportedLocale
  records: ChatEvidenceRecord[]
}): DirectChatRetrievalPlanResult | null {
  if (
    params.plan.sourceStrategy !== 'only' ||
    !params.plan.sourceCategories.includes('profile')
  ) {
    return null
  }

  const responseConfig = STRUCTURED_PROFILE_RESPONSE[params.locale]
  const techStackResponseConfig = TECH_STACK_PROFILE_RESPONSE[params.locale]

  if (
    responseConfig.recentCareerPattern.test(params.plan.standaloneQuestion)
  ) {
    const careerSectionPrefix = `${responseConfig.careerSection} > `
    const careerRecords = params.records.filter((record) => {
      return (
        record.sourceCategory === 'profile' &&
        record.content.startsWith(careerSectionPrefix)
      )
    })
    const careerRecordsByMostRecentEndDate = careerRecords.toSorted(
      (leftRecord, rightRecord) => {
        const leftEndDate =
          leftRecord.content.match(PROFILE_PERIOD.PATTERN)?.[2] ?? ''
        const rightEndDate =
          rightRecord.content.match(PROFILE_PERIOD.PATTERN)?.[2] ?? ''

        return rightEndDate.localeCompare(leftEndDate)
      },
    )
    const recentCareerRecord = careerRecordsByMostRecentEndDate[0]
    const periodMatch = recentCareerRecord?.content.match(
      PROFILE_PERIOD.PATTERN,
    )

    if (recentCareerRecord && periodMatch) {
      return {
        kind: 'direct',
        response: {
          answer: responseConfig.recentCareerAnswer
            .replace('{workplace}', recentCareerRecord.sectionTitle ?? '')
            .replace('{startDate}', periodMatch[1])
            .replace('{endDate}', periodMatch[2]),
          grounded: true,
          citations: [
            {
              title: recentCareerRecord.title,
              url: recentCareerRecord.url,
              sectionTitle: recentCareerRecord.sectionTitle,
              sourceCategory: recentCareerRecord.sourceCategory,
            },
          ],
        },
        matches: [recentCareerRecord],
      }
    }
  }

  if (
    techStackResponseConfig.questionPattern.test(
      params.plan.standaloneQuestion,
    )
  ) {
    const techStackRecord = params.records.find((record) => {
      return record.id.endsWith(
        TECH_STACK_PROFILE_RESPONSE.SOURCE_IDENTIFIER_SUFFIX,
      )
    })
    const techStackLine = techStackRecord?.content
      .split('\n')
      .find((contentLine) => {
        return contentLine.startsWith(techStackResponseConfig.contentLabel)
      })
    const techStacks = techStackLine
      ?.slice(techStackResponseConfig.contentLabel.length)
      .trim()

    if (techStackRecord && techStacks) {
      return {
        kind: 'direct',
        response: {
          answer: `${techStackResponseConfig.answerPrefix} ${techStacks}${techStackResponseConfig.answerSuffix}`,
          grounded: true,
          citations: [
            {
              title: techStackRecord.title,
              url: techStackRecord.url,
              sectionTitle: techStackRecord.sectionTitle,
              sourceCategory: techStackRecord.sourceCategory,
            },
          ],
        },
        matches: [techStackRecord],
      }
    }
  }

  const selectedSection = responseConfig.educationPattern.test(
    params.plan.standaloneQuestion,
  )
    ? {
        heading: responseConfig.educationHeading,
        section: responseConfig.educationSection,
      }
    : responseConfig.experiencePattern.test(params.plan.standaloneQuestion)
      ? {
          heading: responseConfig.experienceHeading,
          section: responseConfig.experienceSection,
        }
      : null

  if (!selectedSection) {
    return null
  }

  const primaryProfileIdentifierPrefix = `${params.locale}/about/profile/`
  const sectionPrefix = `${selectedSection.section} > `
  const selectedRecords = params.records.filter((record) => {
    return (
      record.sourceCategory === 'profile' &&
      record.id.startsWith(primaryProfileIdentifierPrefix) &&
      !record.id.includes('profile-reference-') &&
      record.content.startsWith(sectionPrefix)
    )
  })

  if (selectedRecords.length === 0) {
    return null
  }

  return {
    kind: 'direct',
    response: {
      answer: [
        selectedSection.heading,
        ...selectedRecords.map((record) => {
          const [sectionPath, ...contentLines] = record.content.split('\n')
          const sectionTitle = sectionPath.replace(sectionPrefix, '').trim()

          return `- ${sectionTitle}: ${contentLines.join(' ').trim()}`
        }),
      ].join('\n'),
      grounded: true,
      citations: selectedRecords.map((record) => {
        return {
          title: record.title,
          url: record.url,
          sectionTitle: record.sectionTitle,
          sourceCategory: record.sourceCategory,
        }
      }),
    },
    matches: selectedRecords,
  }
}

async function retrieveDefaultSemanticMatches(
  params: RetrieveSemanticMatchesParams,
): Promise<ChatEvidenceRecord[]> {
  const result = await runChatRagWorkflow({
    question: params.plan.standaloneQuestion,
    locale: params.locale,
    retrievalPlan: params.plan,
  })

  if (result.failureKind) {
    throw new Error('Chat semantic retrieval failed.')
  }

  return result.matches
}

export async function executeChatRetrievalPlan({
  plan,
  locale,
  blogRecords,
  curatedRecords,
  retrieveSemanticMatches = retrieveDefaultSemanticMatches,
}: ExecuteChatRetrievalPlanParams): Promise<ExecuteChatRetrievalPlanResult> {
  const scopedRecords = filterRecordsByPlan(
    [...blogRecords, ...curatedRecords],
    plan,
  )

  if (plan.executionKind === 'direct_metadata') {
    return buildDirectMetadataResult({ plan, locale, records: scopedRecords })
  }

  const structuredProfileResult = buildStructuredProfileResult({
    plan,
    locale,
    records: scopedRecords,
  })

  if (structuredProfileResult) {
    return structuredProfileResult
  }

  if (plan.executionKind !== 'retrieve_and_generate') {
    return {
      kind: 'refusal',
      refusalReason: 'insufficient_search_match',
      matches: [],
    }
  }

  const preferredSourceCategories =
    plan.sourceStrategy === 'prefer' ? plan.sourceCategories : []
  const rankingConcepts = [...plan.requiredConcepts, ...plan.optionalConcepts]
  const currentSourceTarget = plan.canonicalTargets.find((target) => {
    return target.kind === 'current_source'
  })
  const isAggregateOperation =
    plan.operation === 'compare' ||
    plan.operation === 'recommend' ||
    plan.operation === 'summarize'
  const shouldUseSingleMatchPerSlug =
    isAggregateOperation &&
    !plan.sourceCategories.includes('profile') &&
    (plan.canonicalTargets.length === 0 || plan.canonicalTargets.length > 1)
  const lexicalSelection = selectChatSearchMatches({
    question: plan.standaloneQuestion,
    locale,
    records: scopedRecords,
    rankingConcepts,
    preferredSourceCategories,
    currentPostSlug: currentSourceTarget?.slug ?? undefined,
    allowBroadMatch:
      isAggregateOperation ||
      plan.temporalStrategy !== 'none' ||
      Boolean(currentSourceTarget),
    maximumMatchCount: plan.maximumEvidenceCount,
  })
  let rawSemanticMatches: ChatEvidenceRecord[] = []
  let semanticRetrievalError: unknown = null

  try {
    rawSemanticMatches = await retrieveSemanticMatches({ plan, locale })
  } catch (error) {
    semanticRetrievalError = error

    if (lexicalSelection.matches.length === 0) {
      throw error
    }
  }

  const semanticMatches = filterRecordsByPlan(rawSemanticMatches, plan)
  const coveredMatches = selectEvidenceCoveringRequiredConcepts({
    matches: mergeUniqueMatches([lexicalSelection.matches, semanticMatches]),
    requiredConcepts: plan.requiredConcepts,
    locale,
  })
  const sortedMatches = sortMatchesByPlan(coveredMatches, plan)
  const matches =
    plan.temporalStrategy === 'single'
      ? selectSingleDocumentMatches(sortedMatches, plan.maximumEvidenceCount)
      : limitMatchesWithDiversity(
          sortedMatches,
          plan.maximumEvidenceCount,
          shouldUseSingleMatchPerSlug
            ? BLOG_CHAT.SEARCH.MAXIMUM_MATCHES_PER_SLUG_FOR_AGGREGATE
            : BLOG_CHAT.SEARCH.MAXIMUM_MATCHES_PER_SLUG,
        )

  if (matches.length === 0) {
    if (semanticRetrievalError) {
      throw semanticRetrievalError
    }

    return {
      kind: 'refusal',
      refusalReason: 'insufficient_search_match',
      matches: [],
    }
  }

  return {
    kind: 'evidence',
    matches,
    lexicalMatches: lexicalSelection.matches,
    semanticMatches,
    reranked: false,
  }
}
