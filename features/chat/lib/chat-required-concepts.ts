import { CHAT_QUESTION_RULES } from '@/features/chat/config/question-rules'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import type { SupportedLocale } from '@/shared/config/constants'

const CHAT_CONCEPT_NORMALIZATION = {
  WHITESPACE_PATTERN: /\s+/g,
} as const

function normalizeConceptText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replaceAll(CHAT_CONCEPT_NORMALIZATION.WHITESPACE_PATTERN, '')
}

function buildCanonicalConceptMap(): Map<string, string> {
  const canonicalConceptMap = new Map<string, string>()

  for (const [canonicalConcept, aliases] of Object.entries(
    CHAT_QUESTION_RULES.TERM_EXPANSIONS,
  )) {
    const normalizedCanonicalConcept = normalizeConceptText(canonicalConcept)
    canonicalConceptMap.set(
      normalizedCanonicalConcept,
      normalizedCanonicalConcept,
    )

    for (const alias of aliases) {
      canonicalConceptMap.set(
        normalizeConceptText(alias),
        normalizedCanonicalConcept,
      )
    }
  }

  return canonicalConceptMap
}

const CANONICAL_CONCEPT_MAP = buildCanonicalConceptMap()

function resolveCanonicalConcept(concept: string): string {
  const normalizedConcept = normalizeConceptText(concept)

  return CANONICAL_CONCEPT_MAP.get(normalizedConcept) ?? normalizedConcept
}

function buildConceptAliases(concept: string): string[] {
  const canonicalConcept = resolveCanonicalConcept(concept)
  const configuredAliases =
    CHAT_QUESTION_RULES.TERM_EXPANSIONS[
      canonicalConcept as keyof typeof CHAT_QUESTION_RULES.TERM_EXPANSIONS
    ] ?? []

  return [
    ...new Set([
      canonicalConcept,
      ...configuredAliases.map((alias) => normalizeConceptText(alias)),
    ]),
  ]
}

function buildEvidenceSearchText(record: ChatEvidenceRecord): string {
  return normalizeConceptText(
    [
      record.title,
      record.sectionTitle ?? '',
      record.content,
      record.tags.join(' '),
      (record.searchTerms ?? []).join(' '),
    ].join(' '),
  )
}

function recordMatchesConcept(
  record: ChatEvidenceRecord,
  concept: string,
): boolean {
  const evidenceSearchText = buildEvidenceSearchText(record)

  return buildConceptAliases(concept).some((alias) => {
    return evidenceSearchText.includes(alias)
  })
}

export function normalizeChatConcepts(params: {
  concepts: string[]
  locale: SupportedLocale
}): string[] {
  void params.locale

  return [
    ...new Set(params.concepts.map((concept) => resolveCanonicalConcept(concept))),
  ]
}

export function selectEvidenceCoveringRequiredConcepts(params: {
  matches: ChatEvidenceRecord[]
  requiredConcepts: string[]
  locale: SupportedLocale
}): ChatEvidenceRecord[] {
  const requiredConcepts = normalizeChatConcepts({
    concepts: params.requiredConcepts,
    locale: params.locale,
  })

  if (requiredConcepts.length === 0) {
    return params.matches
  }

  const requiredMatchMap = new Map<string, ChatEvidenceRecord>()

  for (const requiredConcept of requiredConcepts) {
    const requiredMatch = params.matches.find((match) => {
      return recordMatchesConcept(match, requiredConcept)
    })

    if (!requiredMatch) {
      return []
    }

    requiredMatchMap.set(requiredMatch.id, requiredMatch)
  }

  for (const match of params.matches) {
    requiredMatchMap.set(match.id, match)
  }

  return [...requiredMatchMap.values()]
}
