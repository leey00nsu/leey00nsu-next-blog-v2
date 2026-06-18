import { cache } from 'react'
import { GENERATED_BLOG_SEARCH_RECORDS } from '@/entities/post/config/blog-search-records.generated'
import type { ChatEntityCandidate } from '@/features/chat/model/chat-entity-candidate'
import type {
  ChatEvidenceRecord,
  ChatSourceCategory,
} from '@/features/chat/model/chat-evidence'
import { getCuratedChatSources } from '@/features/chat/model/get-curated-chat-sources'
import type { SupportedLocale } from '@/shared/config/constants'

const SOURCE_CATEGORY_TO_ENTITY_KIND = {
  blog: 'post',
  project: 'project',
  profile: 'profile',
  assistant: 'assistant',
} as const satisfies Record<ChatSourceCategory, ChatEntityCandidate['kind']>

function normalizeComparableText(value: string): string {
  return value.toLocaleLowerCase().replaceAll(/[^\p{L}\p{N}]/gu, '')
}

function collectUniqueValues(values: string[]): string[] {
  const uniqueValues = new Map<string, string>()

  for (const value of values) {
    const trimmedValue = value.trim()

    if (!trimmedValue) {
      continue
    }

    const normalizedValue = trimmedValue.toLocaleLowerCase()

    if (!uniqueValues.has(normalizedValue)) {
      uniqueValues.set(normalizedValue, trimmedValue)
    }
  }

  return [...uniqueValues.values()]
}

function collectCanonicalAliases(params: {
  sourceCategory: ChatSourceCategory
  title: string
  slug: string
  searchTerms: string[]
}): string[] {
  if (
    params.sourceCategory === 'profile' ||
    params.sourceCategory === 'assistant'
  ) {
    return collectUniqueValues([
      params.title,
      params.slug,
      ...params.searchTerms,
    ])
  }

  const canonicalComparableValues = new Set([
    normalizeComparableText(params.title),
    normalizeComparableText(params.slug),
  ])

  return collectUniqueValues([
    params.title,
    params.slug,
    ...params.searchTerms.filter((searchTerm) => {
      return canonicalComparableValues.has(normalizeComparableText(searchTerm))
    }),
  ])
}

export function buildChatEntityCandidates(params: {
  records: ChatEvidenceRecord[]
}): ChatEntityCandidate[] {
  const recordGroups = new Map<string, ChatEvidenceRecord[]>()

  for (const record of params.records) {
    const groupKey = `${record.sourceCategory}/${record.slug}`
    const group = recordGroups.get(groupKey) ?? []
    group.push(record)
    recordGroups.set(groupKey, group)
  }

  return [...recordGroups.entries()].map(([entityId, records]) => {
    const representativeRecord = records[0]
    const searchTerms = collectUniqueValues(
      records.flatMap((record) => record.searchTerms ?? []),
    )

    return {
      entityId,
      kind: SOURCE_CATEGORY_TO_ENTITY_KIND[representativeRecord.sourceCategory],
      slug: representativeRecord.slug,
      title: representativeRecord.title,
      aliases: collectCanonicalAliases({
        sourceCategory: representativeRecord.sourceCategory,
        title: representativeRecord.title,
        slug: representativeRecord.slug,
        searchTerms,
      }),
      searchTerms,
      sourceCategory: representativeRecord.sourceCategory,
    }
  })
}

export const getChatEntityCandidates = cache(
  async (locale: SupportedLocale): Promise<ChatEntityCandidate[]> => {
    const curatedRecords = await getCuratedChatSources(locale)
    const blogRecords = GENERATED_BLOG_SEARCH_RECORDS[locale].map((record) => {
      return {
        ...record,
        sourceCategory: 'blog' as const,
      }
    })

    return buildChatEntityCandidates({
      records: [...blogRecords, ...curatedRecords],
    })
  },
)
