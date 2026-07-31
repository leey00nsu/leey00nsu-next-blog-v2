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
    latest: '가장 최근 자료는 {title}이며, {date}에 게시됐습니다.',
    oldest: '가장 오래된 자료는 {title}이며, {date}에 게시됐습니다.',
  },
  en: {
    latest: 'The latest item is {title}, published on {date}.',
    oldest: 'The oldest item is {title}, published on {date}.',
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
): ChatEvidenceRecord[] {
  const slugCountMap = new Map<string, number>()
  const selectedMatches: ChatEvidenceRecord[] = []

  for (const match of matches) {
    const slugMatchCount = slugCountMap.get(match.slug) ?? 0

    if (slugMatchCount >= BLOG_CHAT.SEARCH.MAXIMUM_MATCHES_PER_SLUG) {
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
  const responseTemplate =
    DIRECT_METADATA_RESPONSES[params.locale][temporalOrder]
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
  const lexicalSelection = selectChatSearchMatches({
    question: plan.standaloneQuestion,
    locale,
    records: scopedRecords,
    rankingConcepts,
    preferredSourceCategories,
    allowBroadMatch:
      plan.operation === 'recommend' || plan.temporalStrategy !== 'none',
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
      : limitMatchesWithDiversity(sortedMatches, plan.maximumEvidenceCount)

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
