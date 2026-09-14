import {
  rerankChatEvidence,
  type RerankChatEvidence,
} from '@/features/chat/api/rerank-chat-evidence'
import { BLOG_CHAT } from '@/features/chat/config/constants'
import {
  isAggregateChatRetrievalPlan,
  resolveChatEvidenceDiversityPolicy,
  type ChatEvidenceDiversityPolicy,
} from '@/features/chat/lib/chat-evidence-diversity'
import {
  doesChatEvidenceMatchConcept,
  selectEnforceableChatConcepts,
  selectEvidenceCoveringRequiredConcepts,
  selectRequiredConceptMatches,
} from '@/features/chat/lib/chat-required-concepts'
import { normalizeChatQuery } from '@/features/chat/lib/chat-query-normalization'
import { fuseChatRetrievalMatches } from '@/features/chat/lib/chat-retrieval-fusion'
import { selectChatSearchMatches } from '@/features/chat/lib/chat-search'
import { shouldRerankChatEvidence } from '@/features/chat/lib/should-rerank-chat-evidence'
import type {
  ChatEvidenceRecord,
  ChatEvidenceTimeKind,
} from '@/features/chat/model/chat-evidence'
import type { ChatRetrievalPlan } from '@/features/chat/model/chat-retrieval-plan'
import { runChatRagWorkflow } from '@/features/chat/model/chat-rag-workflow'
import type { BlogChatResponse } from '@/features/chat/model/chat-schema'
import type { SupportedLocale } from '@/shared/config/constants'

interface RetrieveSemanticMatchesParams {
  plan: ChatRetrievalPlan
  locale: SupportedLocale
  embedQuestion?: (question: string) => Promise<number[]>
}

type RetrieveSemanticMatches = (
  params: RetrieveSemanticMatchesParams,
) => Promise<ChatEvidenceRecord[]>

interface ExecuteChatRetrievalPlanParams {
  plan: ChatRetrievalPlan
  locale: SupportedLocale
  blogRecords: ChatEvidenceRecord[]
  curatedRecords: ChatEvidenceRecord[]
  hasConversationContext?: boolean
  embedQuestion?: (question: string) => Promise<number[]>
  retrieveSemanticMatches?: RetrieveSemanticMatches
  rerankMatches?: RerankChatEvidence
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
  reranked: boolean
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
    project_started: {
      latest:
        '가장 최근에 시작한 프로젝트는 {title}이며, {date}에 시작했습니다.',
      oldest:
        '가장 오래전에 시작한 프로젝트는 {title}이며, {date}에 시작했습니다.',
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
    project_started: {
      latest:
        'The most recently started project is {title}, started on {date}.',
      oldest: 'The earliest started project is {title}, started on {date}.',
    },
    project_ended: {
      latest:
        'The most recently completed project is {title}, completed on {date}.',
      oldest: 'The earliest completed project is {title}, completed on {date}.',
    },
  },
} as const

type DirectMetadataResponseKind = keyof (typeof DIRECT_METADATA_RESPONSES)['ko']

function resolveDirectMetadataResponseKind(
  evidenceTimeKind: ChatEvidenceTimeKind | undefined,
): DirectMetadataResponseKind {
  if (evidenceTimeKind === 'project_started') {
    return 'project_started'
  }

  if (evidenceTimeKind === 'project_ended') {
    return 'project_ended'
  }

  return 'published'
}

const STRUCTURED_PROFILE_RESPONSE = {
  ko: {
    recentCareerPattern: /(?:최근|최신|마지막|어디(?:에서)?\s*(?:일|근무))/u,
    recentCareerAnswer:
      '가장 최근 근무처는 {workplace}이며, {startDate}부터 {endDate}까지 근무했습니다.',
    careerSection: '경력',
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
  PATTERN: /(\d{4}\.\d{2})(?:\s*[~–—-]\s*|\s+)(\d{4}\.\d{2}|present|현재)/iu,
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
    questionPattern:
      /primary\s+tech|tech(?:nology)?\s+stack|main\s+technologies/iu,
    contentLabel: 'Common/repeated technologies:',
    answerPrefix:
      'The primary technologies used repeatedly across projects are',
    answerSuffix: '.',
  },
} as const

/** 날짜가 없는 근거는 시간 정렬에서 제외해야 하므로 null로 구분한다. */
function resolveEvidenceTimestamp(record: ChatEvidenceRecord): number | null {
  const timestampValue = record.evidenceTime?.value ?? record.publishedAt

  if (!timestampValue) {
    return null
  }

  const timestamp = new Date(timestampValue).getTime()

  return Number.isNaN(timestamp) ? null : timestamp
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

function sortMatchesByPlan(
  matches: ChatEvidenceRecord[],
  plan: ChatRetrievalPlan,
  prioritizeRequiredConcepts = true,
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

    if (prioritizeRequiredConcepts && requiredConceptDifference !== 0) {
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

    const leftTimestamp = resolveEvidenceTimestamp(leftMatch)
    const rightTimestamp = resolveEvidenceTimestamp(rightMatch)

    // 날짜가 없는 항목은 가장 오래된 항목으로 취급하지 않고 항상 뒤로 보낸다.
    if (leftTimestamp === null || rightTimestamp === null) {
      return (
        (leftTimestamp === null ? 1 : 0) - (rightTimestamp === null ? 1 : 0)
      )
    }

    const timeDifference = rightTimestamp - leftTimestamp

    return plan.temporalOrder === 'oldest' ? -timeDifference : timeDifference
  })
}

function limitMatchesWithDiversity(params: {
  matches: ChatEvidenceRecord[]
  maximumEvidenceCount: number
  diversityPolicy: ChatEvidenceDiversityPolicy
  requiredMatchIds: Set<string>
}): ChatEvidenceRecord[] {
  const groupCountMap = new Map<string, number>()
  const selectedMatchIds = new Set(params.requiredMatchIds)

  if (selectedMatchIds.size > params.maximumEvidenceCount) {
    return []
  }

  for (const match of params.matches) {
    if (!selectedMatchIds.has(match.id)) {
      continue
    }

    const groupKey = params.diversityPolicy.resolveGroupKey(match)

    groupCountMap.set(groupKey, (groupCountMap.get(groupKey) ?? 0) + 1)
  }

  for (const match of params.matches) {
    if (selectedMatchIds.has(match.id)) {
      continue
    }

    if (selectedMatchIds.size >= params.maximumEvidenceCount) {
      break
    }

    const groupKey = params.diversityPolicy.resolveGroupKey(match)
    const groupMatchCount = groupCountMap.get(groupKey) ?? 0

    if (groupMatchCount >= params.diversityPolicy.maximumMatchesPerGroup) {
      continue
    }

    groupCountMap.set(groupKey, groupMatchCount + 1)
    selectedMatchIds.add(match.id)
  }

  return params.matches.filter((match) => selectedMatchIds.has(match.id))
}

function collectRequiredMatchIds(params: {
  matches: ChatEvidenceRecord[]
  requiredConcepts: string[]
}): Set<string> {
  const requiredMatchIds = new Set<string>()

  for (const requiredConcept of params.requiredConcepts) {
    const requiredMatch = params.matches.find((match) => {
      return doesChatEvidenceMatchConcept(match, requiredConcept)
    })

    if (requiredMatch) {
      requiredMatchIds.add(requiredMatch.id)
    }
  }

  return requiredMatchIds
}

function doMatchesCoverRequiredConcepts(params: {
  matches: ChatEvidenceRecord[]
  requiredConcepts: string[]
}): boolean {
  return params.requiredConcepts.every((requiredConcept) => {
    return params.matches.some((match) => {
      return doesChatEvidenceMatchConcept(match, requiredConcept)
    })
  })
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

  // 날짜가 없는 항목은 "가장 최근/오래된" 후보가 될 수 없다. 그대로 고르면 날짜 없는 문장이 나온다.
  const datedRecords = [...uniqueDocumentMap.values()].filter((record) => {
    return resolveEvidenceTimestamp(record) !== null
  })
  const selectedRecord = sortMatchesByPlan(datedRecords, params.plan)[0]

  if (!selectedRecord) {
    return {
      kind: 'refusal',
      refusalReason: 'insufficient_search_match',
      matches: [],
    }
  }

  const temporalOrder = params.plan.temporalOrder ?? 'latest'
  const responseKind = resolveDirectMetadataResponseKind(
    selectedRecord.evidenceTime?.kind,
  )
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

  if (responseConfig.recentCareerPattern.test(params.plan.standaloneQuestion)) {
    const careerSectionPrefix = `${responseConfig.careerSection} > `
    const careerRecords = params.records.filter((record) => {
      return (
        record.sourceCategory === 'profile' &&
        (record.content.startsWith(careerSectionPrefix) ||
          record.content.startsWith('Career > '))
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
    techStackResponseConfig.questionPattern.test(params.plan.standaloneQuestion)
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
    embedQuestion: params.embedQuestion,
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
  hasConversationContext = false,
  embedQuestion,
  retrieveSemanticMatches = retrieveDefaultSemanticMatches,
  rerankMatches = rerankChatEvidence,
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

  if (
    plan.executionKind !== 'retrieve_and_generate' &&
    plan.executionKind !== 'direct_profile'
  ) {
    return {
      kind: 'refusal',
      refusalReason: 'insufficient_search_match',
      matches: [],
    }
  }

  const enforceableRequiredConcepts = selectEnforceableChatConcepts({
    concepts: plan.requiredConcepts,
    records: [...blogRecords, ...curatedRecords],
  })
  const unverifiableRequiredConcepts = plan.requiredConcepts.filter(
    (concept) => {
      return !enforceableRequiredConcepts.includes(concept)
    },
  )
  const evidencePlan: ChatRetrievalPlan = {
    ...plan,
    requiredConcepts: enforceableRequiredConcepts,
    optionalConcepts: [
      ...new Set([...plan.optionalConcepts, ...unverifiableRequiredConcepts]),
    ],
    // 필수 개념은 모두 근거로 덮여야 하므로 최대 근거 수가 그보다 적을 수 없다.
    maximumEvidenceCount: Math.max(
      plan.maximumEvidenceCount,
      enforceableRequiredConcepts.length,
    ),
  }
  const preferredSourceCategories =
    evidencePlan.sourceStrategy === 'prefer'
      ? evidencePlan.sourceCategories
      : []
  const rankingConcepts = [
    ...evidencePlan.requiredConcepts,
    ...evidencePlan.optionalConcepts,
  ]
  const currentSourceTarget = evidencePlan.canonicalTargets.find((target) => {
    return target.kind === 'current_source'
  })
  const isAggregateOperation = isAggregateChatRetrievalPlan(evidencePlan)
  const maximumMatchesPerSlug =
    evidencePlan.operation === 'recommend'
      ? BLOG_CHAT.SEARCH.MAXIMUM_MATCHES_PER_SLUG_FOR_AGGREGATE
      : BLOG_CHAT.SEARCH.MAXIMUM_MATCHES_PER_SLUG
  const diversityPolicy = resolveChatEvidenceDiversityPolicy({
    plan: evidencePlan,
    maximumMatchesPerSlug,
  })
  const lexicalSelection = selectChatSearchMatches({
    question: evidencePlan.standaloneQuestion,
    locale,
    records: scopedRecords,
    rankingConcepts,
    preferredSourceCategories,
    currentPostSlug: currentSourceTarget?.slug ?? undefined,
    allowBroadMatch:
      isAggregateOperation ||
      evidencePlan.temporalStrategy !== 'none' ||
      Boolean(currentSourceTarget),
    maximumMatchCount: Math.max(
      BLOG_CHAT.SEARCH.MAXIMUM_CANDIDATE_COUNT,
      evidencePlan.maximumEvidenceCount,
    ),
    diversityPolicy: {
      ...diversityPolicy,
      maximumMatchesPerGroup: BLOG_CHAT.SEARCH.MAXIMUM_CANDIDATE_COUNT,
    },
  })
  let rawSemanticMatches: ChatEvidenceRecord[] = []
  let semanticRetrievalError: unknown = null

  try {
    rawSemanticMatches = await retrieveSemanticMatches({
      plan: evidencePlan,
      locale,
      embedQuestion,
    })
  } catch (error) {
    semanticRetrievalError = error

    if (lexicalSelection.matches.length === 0) {
      throw error
    }
  }

  const semanticMatches = filterRecordsByPlan(rawSemanticMatches, plan)
  const fusedMatches = fuseChatRetrievalMatches({
    lexicalMatches: lexicalSelection.matches,
    semanticMatches,
    preferredSourceCategories,
    currentPostSlug: currentSourceTarget?.slug ?? undefined,
    maximumMatchCount: lexicalSelection.matches.length + semanticMatches.length,
  })
  const requiredConceptMatches = selectRequiredConceptMatches({
    concepts: evidencePlan.requiredConcepts,
    records: scopedRecords,
    questionTokens: normalizeChatQuery({
      question: evidencePlan.standaloneQuestion,
      locale,
    }).queryTokens,
  })
  const supportingMatches = requiredConceptMatches.flatMap((requiredMatch) => {
    return selectChatSearchMatches({
      question: evidencePlan.standaloneQuestion,
      locale,
      records: scopedRecords.filter(
        (record) =>
          record.slug === requiredMatch.slug &&
          record.sourceCategory === requiredMatch.sourceCategory,
      ),
      allowBroadMatch: true,
      maximumMatchCount: evidencePlan.maximumEvidenceCount,
      diversityPolicy: {
        resolveGroupKey: (record) => record.url,
        maximumMatchesPerGroup: evidencePlan.maximumEvidenceCount,
      },
    }).matches
  })
  const targetMetadataMatches = scopedRecords.filter(
    (record) =>
      record.id.endsWith('/metadata') &&
      evidencePlan.canonicalTargets.some(
        (target) =>
          target.slug === record.slug &&
          target.sourceCategory === record.sourceCategory,
      ),
  )
  const seededMatches = [
    ...fusedMatches,
    ...[
      ...requiredConceptMatches,
      ...supportingMatches,
      ...targetMetadataMatches,
    ].filter((requiredMatch, index, additions) => {
      if (
        additions.findIndex((match) => match.id === requiredMatch.id) !== index
      )
        return false
      return !fusedMatches.some((match) => match.id === requiredMatch.id)
    }),
  ]
  const coveredMatches = selectEvidenceCoveringRequiredConcepts({
    matches: seededMatches,
    requiredConcepts: evidencePlan.requiredConcepts,
    locale,
  })
  const sortedMatches = sortMatchesByPlan(coveredMatches, evidencePlan)
  // 날짜로 지정한 문서는 관련도 재정렬 전에 확정한다.
  const rerankCandidates =
    evidencePlan.temporalStrategy === 'single'
      ? selectSingleDocumentMatches(sortedMatches, sortedMatches.length)
      : sortedMatches
  // 리랭커는 최종 근거 수를 정하기 전에 넓은 후보 풀에서 고른다. 선별 뒤에 호출하면
  // 이미 잘린 목록의 순서만 바꿀 수 있어, 후보에 있던 근거를 살릴 수 없다.
  const rerankResult = shouldRerankChatEvidence({
    question: evidencePlan.standaloneQuestion,
    matchCount: rerankCandidates.length,
    plan: evidencePlan,
    hasConversationContext,
  })
    ? await rerankMatches({
        question: evidencePlan.standaloneQuestion,
        matches: rerankCandidates,
      })
    : null
  const rerankedMatches = rerankResult?.applied
    ? rerankResult.matches
    : rerankCandidates
  const orderedMatches =
    evidencePlan.temporalStrategy === 'rank'
      ? sortMatchesByPlan(rerankedMatches, evidencePlan, false)
      : rerankedMatches
  const requiredMatchIds = collectRequiredMatchIds({
    matches: orderedMatches,
    requiredConcepts: evidencePlan.requiredConcepts,
  })
  const limitedMatches =
    evidencePlan.temporalStrategy === 'single'
      ? selectSingleDocumentMatches(
          orderedMatches,
          evidencePlan.maximumEvidenceCount,
        )
      : limitMatchesWithDiversity({
          matches: orderedMatches,
          maximumEvidenceCount: evidencePlan.maximumEvidenceCount,
          diversityPolicy,
          requiredMatchIds,
        })
  const matches = doMatchesCoverRequiredConcepts({
    matches: limitedMatches,
    requiredConcepts: evidencePlan.requiredConcepts,
  })
    ? limitedMatches
    : []

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
    reranked: Boolean(rerankResult?.applied),
  }
}
