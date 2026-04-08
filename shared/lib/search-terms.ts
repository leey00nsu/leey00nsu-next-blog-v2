import { SEMANTIC_SEARCH } from '@/shared/config/search-terms'

interface CollectSearchTermsParams {
  texts?: string[]
  phrases?: string[]
}

const TOKEN_PATTERNS = {
  WORD: /[\p{L}\p{N}][\p{L}\p{N}+#.-]*/gu,
} as const

const SCRIPT_BOUNDARY_PATTERNS = {
  LATIN_TO_HANGUL: /([A-Za-z])([가-힣])/g,
  HANGUL_TO_LATIN: /([가-힣])([A-Za-z])/g,
} as const

function normalizeText(text: string): string {
  return text
    .replaceAll(SCRIPT_BOUNDARY_PATTERNS.LATIN_TO_HANGUL, '$1 $2')
    .replaceAll(SCRIPT_BOUNDARY_PATTERNS.HANGUL_TO_LATIN, '$1 $2')
    .toLowerCase()
    .trim()
}

function tokenizeText(text: string): string[] {
  const normalizedText = normalizeText(text)
  const stopWords = new Set<string>([
    ...SEMANTIC_SEARCH.STOP_WORDS.en,
    ...SEMANTIC_SEARCH.STOP_WORDS.ko,
  ])

  return [...new Set(normalizedText.match(TOKEN_PATTERNS.WORD) ?? [])].filter(
    (token) => {
      return (
        token.length >= SEMANTIC_SEARCH.MINIMUM_TOKEN_LENGTH &&
        !stopWords.has(token)
      )
    },
  )
}

function buildPhraseVariants(phrase: string): string[] {
  const normalizedPhrase = normalizeText(phrase)
  const matchedTermGroup = SEMANTIC_SEARCH.TERM_GROUPS.find((termGroup) => {
    return termGroup.some((term) => normalizeText(term) === normalizedPhrase)
  })

  if (!matchedTermGroup) {
    return [normalizedPhrase]
  }

  return matchedTermGroup.map((term) => normalizeText(term))
}

export function collectSearchTerms({
  texts = [],
  phrases = [],
}: CollectSearchTermsParams): string[] {
  const collectedTerms = new Set<string>()
  const normalizedPhrases = phrases.map((phrase) => normalizeText(phrase)).filter(Boolean)

  for (const phrase of normalizedPhrases) {
    for (const phraseVariant of buildPhraseVariants(phrase)) {
      collectedTerms.add(phraseVariant)
    }
  }

  for (const text of texts) {
    for (const token of tokenizeText(text)) {
      collectedTerms.add(token)

      for (const phraseVariant of buildPhraseVariants(token)) {
        collectedTerms.add(phraseVariant)
      }
    }
  }

  return [...collectedTerms].slice(0, SEMANTIC_SEARCH.SEARCH_TERM_LIMIT)
}
