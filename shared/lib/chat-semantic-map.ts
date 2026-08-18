import { GENERATED_CHAT_SEMANTIC_MAP } from '@/shared/config/chat-semantic-map.generated'
import { LOCALES, type SupportedLocale } from '@/shared/config/constants'
import {
  buildSemanticSearchTerms,
  collectUniqueChatSemanticValues,
} from '@/shared/lib/chat-semantic-entry'
import type {
  ChatSemanticEntry,
  GeneratedChatSemanticMap,
} from '@/shared/model/chat-semantic-map'

const CHAT_SEMANTIC_MAP = {
  CANONICAL_CROSS_LOCALE_SOURCE_CATEGORIES: [
    'profile',
    'assistant',
  ] as ReadonlyArray<ChatSemanticEntry['sourceCategory']>,
} as const

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
    CHAT_SEMANTIC_MAP.CANONICAL_CROSS_LOCALE_SOURCE_CATEGORIES.includes(
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

  return collectUniqueChatSemanticValues(
    matchedEntries.flatMap((matchedEntry) => {
      return buildSemanticSearchTerms(matchedEntry)
    }),
  )
}
