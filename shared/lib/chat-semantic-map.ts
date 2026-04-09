import { LOCALES, type SupportedLocale } from '@/shared/config/constants'
import { GENERATED_CHAT_SEMANTIC_MAP } from '@/shared/config/chat-semantic-map.generated'
import {
  buildChatQueryTemplates,
  type ChatQueryIntent,
} from '@/shared/config/chat-query-templates'
import type {
  ChatSemanticEntry,
  GeneratedChatSemanticMap,
} from '@/shared/model/chat-semantic-map'
import { collectSearchTerms } from '@/shared/lib/search-terms'

interface BuildProfileChatSemanticEntryParams {
  locale: SupportedLocale
  slug: string
  title: string
  description?: string
  content: string
}

interface BuildProjectChatSemanticEntryParams {
  locale: SupportedLocale
  slug: string
  title: string
  summary: string
  keyFeatures: string[]
  techStacks: string[]
}

interface BuildPostChatSemanticEntryParams {
  locale: SupportedLocale
  slug: string
  title: string
  description: string
  tags: string[]
}

const MARKDOWN_PATTERNS = {
  H1_HEADING: /^#\s+(.+)$/m,
  INLINE_CODE: /`([^`]+)`/g,
  LINK: /\[([^\]]+)\]\([^)]+\)/g,
  MARKERS: /[*_>#~-]/g,
  WHITESPACE: /\s+/g,
} as const

const CHAT_SEMANTIC = {
  QUERY_LIMIT_PER_TAG: 2,
  CANONICAL_CROSS_LOCALE_SOURCE_CATEGORIES: [
    'profile',
    'assistant',
  ] as ReadonlyArray<ChatSemanticEntry['sourceCategory']>,
} as const

function normalizeText(text: string): string {
  return text
    .replaceAll(MARKDOWN_PATTERNS.INLINE_CODE, '$1')
    .replaceAll(MARKDOWN_PATTERNS.LINK, '$1')
    .replaceAll(MARKDOWN_PATTERNS.MARKERS, ' ')
    .replaceAll(MARKDOWN_PATTERNS.WHITESPACE, ' ')
    .trim()
    .toLowerCase()
}

function uniqueValues(values: string[]): string[] {
  return [...new Set(values.map((value) => normalizeText(value)).filter(Boolean))]
}

function extractPrimaryProfileName(content: string): string[] {
  const headingMatch = content.match(MARKDOWN_PATTERNS.H1_HEADING)
  const headingName = headingMatch?.[1]?.trim()

  if (!headingName) {
    return []
  }

  return uniqueValues([headingName])
}

function resolveProfileAliases(locale: SupportedLocale): string[] {
  if (locale === LOCALES.DEFAULT) {
    return ['이 사람', '블로그 주인', '작성자', '개발자', '이름']
  }

  return ['author', 'blog owner', 'site owner', 'developer', 'name']
}

function buildFaqQueries(params: {
  locale: SupportedLocale
  queryIntents: Array<{
    queryIntent: ChatQueryIntent
    subjectTerms: string[]
  }>
}): string[] {
  return uniqueValues(
    params.queryIntents.flatMap(({ queryIntent, subjectTerms }) => {
      return buildChatQueryTemplates({
        locale: params.locale,
        queryIntent,
        subjectTerms,
      })
    }),
  )
}

export function buildProfileChatSemanticEntry({
  locale,
  slug,
  title,
  description,
  content,
}: BuildProfileChatSemanticEntryParams): ChatSemanticEntry {
  return {
    locale,
    slug,
    sourceCategory: 'profile',
    entityNames: extractPrimaryProfileName(content),
    aliases: uniqueValues([title, description ?? '', ...resolveProfileAliases(locale)]),
    faqQueries: buildFaqQueries({
      locale,
      queryIntents: [
        {
          queryIntent: 'profile.name',
          subjectTerms:
            locale === LOCALES.DEFAULT
              ? ['이 사람', '블로그 주인', '작성자']
              : ['author'],
        },
        {
          queryIntent: 'profile.identity',
          subjectTerms:
            locale === LOCALES.DEFAULT
              ? ['이 사람', '작성자']
              : ['author', 'blog owner'],
        },
      ],
    }),
  }
}

export function buildProjectChatSemanticEntry({
  locale,
  slug,
  title,
  summary,
  keyFeatures,
  techStacks,
}: BuildProjectChatSemanticEntryParams): ChatSemanticEntry {
  return {
    locale,
    slug,
    sourceCategory: 'project',
    entityNames: uniqueValues([title]),
    aliases: uniqueValues([title, summary, ...keyFeatures, ...techStacks, 'project']),
    faqQueries: buildFaqQueries({
      locale,
      queryIntents: [
        {
          queryIntent: 'project.summary',
          subjectTerms: [normalizeText(title)],
        },
        {
          queryIntent: 'project.tech-stack',
          subjectTerms: techStacks
            .slice(0, CHAT_SEMANTIC.QUERY_LIMIT_PER_TAG)
            .map((techStack) => normalizeText(techStack)),
        },
      ],
    }),
  }
}

export function buildPostChatSemanticEntry({
  locale,
  slug,
  title,
  description,
  tags,
}: BuildPostChatSemanticEntryParams): ChatSemanticEntry {
  return {
    locale,
    slug,
    sourceCategory: 'blog',
    entityNames: uniqueValues([title]),
    aliases: uniqueValues([title, description, ...tags]),
    faqQueries: buildFaqQueries({
      locale,
      queryIntents: [
        {
          queryIntent: 'blog.topic',
          subjectTerms: [
            normalizeText(title),
            ...tags
              .slice(0, CHAT_SEMANTIC.QUERY_LIMIT_PER_TAG)
              .map((tag) => normalizeText(tag)),
          ],
        },
      ],
    }),
  }
}

export function buildSemanticSearchTerms(entry: ChatSemanticEntry): string[] {
  return collectSearchTerms({
    phrases: [...entry.entityNames, ...entry.aliases, ...entry.faqQueries],
  })
}

function resolveGeneratedSemanticMap(): GeneratedChatSemanticMap {
  return GENERATED_CHAT_SEMANTIC_MAP as GeneratedChatSemanticMap
}

export function getSemanticSearchTerms(params: {
  locale: SupportedLocale
  slug: string
  sourceCategory: ChatSemanticEntry['sourceCategory']
}): string[] {
  const { locale, slug, sourceCategory } = params
  const semanticMap = resolveGeneratedSemanticMap()
  const shouldIncludeCrossLocaleFallback =
    CHAT_SEMANTIC.CANONICAL_CROSS_LOCALE_SOURCE_CATEGORIES.includes(
      sourceCategory,
    )
  const semanticEntries = [
    ...(semanticMap[locale] ?? []),
    ...(!shouldIncludeCrossLocaleFallback || locale === LOCALES.DEFAULT
      ? []
      : (semanticMap[LOCALES.DEFAULT] ?? [])),
    ...(!shouldIncludeCrossLocaleFallback || locale === 'en'
      ? []
      : (semanticMap.en ?? [])),
  ]
  const matchedEntries = semanticEntries.filter((entry) => {
    return entry.slug === slug && entry.sourceCategory === sourceCategory
  })

  if (matchedEntries.length === 0) {
    return []
  }

  return uniqueValues(
    matchedEntries.flatMap((matchedEntry) => {
      return buildSemanticSearchTerms(matchedEntry)
    }),
  )
}
