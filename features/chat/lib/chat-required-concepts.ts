import { CHAT_QUESTION_RULES } from '@/features/chat/config/question-rules'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import type { SupportedLocale } from '@/shared/config/constants'

const CHAT_CONCEPT_NORMALIZATION = {
  WHITESPACE_PATTERN: /\s+/g,
  OPTIONAL_INTENT_TERMS: [
    '경력',
    '커리어',
    '학력',
    '학교',
    '대학',
    '전공',
    '학점',
    '교육',
    '경험',
    '관심사',
    '직장',
    '근무',
    '활동',
    '기간',
    '시작',
    '종료',
    '이유',
    '배경',
    '목적',
    '문제',
    '과정',
    '방법',
    '철학',
    '요약',
    '설명',
    '비교',
    '차이',
    '추천',
    '구현',
    '제작',
    '개발',
    '사용',
    '도입',
    '포기',
    '선택',
    '전환',
    '이전',
    '발전',
    '한계',
    '공통',
    '공개',
    '프로젝트',
    '기술스택',
    '기술 스택',
    '스택',
    '문서',
    '구조',
    '검증',
    '핵심',
    '기능',
    '효과',
    '협업',
    '역할',
    '관리',
    '주소',
    '완료',
    '최근',
    '생성',
    '영화',
    '호스팅',
    '인프라',
    '배포',
    '검색',
    'career',
    'education',
    'experience',
    'reason',
    'background',
    'purpose',
    'problem',
    'process',
    'method',
    'philosophy',
    'summary',
    'compare',
    'difference',
    'recommend',
    'implementation',
    'development',
    'migration',
    'project',
    'techstack',
    'tech stack',
    'document',
    'structure',
    'role',
    'management',
    'address',
    'hosting',
    'infrastructure',
    'deployment',
    'search',
  ],
} as const

interface PartitionChatConceptsByRequirementParams {
  requiredConcepts: string[]
  optionalConcepts: string[]
}

interface PartitionChatConceptsByRequirementResult {
  requiredConcepts: string[]
  optionalConcepts: string[]
}

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

export function doesChatEvidenceMatchConcept(
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
  locale?: SupportedLocale
}): string[] {
  void params.locale

  return [
    ...new Set(
      params.concepts.map((concept) => resolveCanonicalConcept(concept)),
    ),
  ]
}

function isOptionalIntentConcept(concept: string): boolean {
  const normalizedConcept = normalizeConceptText(concept)

  return CHAT_CONCEPT_NORMALIZATION.OPTIONAL_INTENT_TERMS.some(
    (optionalIntentTerm) => {
      return normalizedConcept.includes(
        normalizeConceptText(optionalIntentTerm),
      )
    },
  )
}

export function partitionChatConceptsByRequirement({
  requiredConcepts,
  optionalConcepts,
}: PartitionChatConceptsByRequirementParams): PartitionChatConceptsByRequirementResult {
  const collectUniqueConcepts = (concepts: string[]) => {
    const conceptMap = new Map<string, string>()

    for (const concept of concepts) {
      const trimmedConcept = concept.trim()
      const normalizedConcept = normalizeConceptText(trimmedConcept)

      if (normalizedConcept && !conceptMap.has(normalizedConcept)) {
        conceptMap.set(normalizedConcept, trimmedConcept)
      }
    }

    return [...conceptMap.values()]
  }
  const uniqueRequiredConcepts = collectUniqueConcepts(requiredConcepts)
  const uniqueOptionalConcepts = collectUniqueConcepts(optionalConcepts)
  const retainedRequiredConcepts = uniqueRequiredConcepts.filter((concept) => {
    return !isOptionalIntentConcept(concept)
  })
  const demotedRequiredConcepts = uniqueRequiredConcepts.filter((concept) => {
    return isOptionalIntentConcept(concept)
  })

  return {
    requiredConcepts: retainedRequiredConcepts,
    optionalConcepts: collectUniqueConcepts([
      ...uniqueOptionalConcepts,
      ...demotedRequiredConcepts,
    ]),
  }
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
      return doesChatEvidenceMatchConcept(match, requiredConcept)
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
