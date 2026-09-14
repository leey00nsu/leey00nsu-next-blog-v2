import { CHAT_QUESTION_RULES } from '@/features/chat/config/question-rules'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import type { SupportedLocale } from '@/shared/config/constants'
import { normalizeSearchIdentifier } from '@/shared/lib/normalize-search-identifier'

const CHAT_CONCEPT_NORMALIZATION = {
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
  /** 표기가 붙여진 복합 개념을 구성 요소로 확인하기 위한 최소 토큰 길이. */
  MINIMUM_MATCH_TOKEN_LENGTH: 2,
} as const

const CHAT_CONCEPT_TOKEN_PATTERN = /[\p{L}\p{N}][\p{L}\p{N}+#.-]*/gu

interface PartitionChatConceptsByRequirementParams {
  requiredConcepts: string[]
  optionalConcepts: string[]
}

interface PartitionChatConceptsByRequirementResult {
  requiredConcepts: string[]
  optionalConcepts: string[]
}

function normalizeConceptText(text: string): string {
  return normalizeSearchIdentifier(text)
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

/** 표기를 지우기 전의 개념과 alias. 낱말 단위 확인은 붙여 쓴 canonical 표기가 아니라 원문으로 한다. */
function buildRawConceptAliases(concept: string): string[] {
  const canonicalConcept = resolveCanonicalConcept(concept)
  const configuredAliases =
    CHAT_QUESTION_RULES.TERM_EXPANSIONS[
      canonicalConcept as keyof typeof CHAT_QUESTION_RULES.TERM_EXPANSIONS
    ] ?? []

  return [...new Set([concept, canonicalConcept, ...configuredAliases])]
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

  return buildRawConceptAliases(concept).some((alias) => {
    if (evidenceSearchText.includes(normalizeConceptText(alias))) {
      return true
    }

    // "Supertonic Voice Cloning"처럼 여러 낱말을 붙여 만든 개념은 근거가 같은 표현을
    // 그대로 쓰지 않을 수 있다. 이때는 구성 요소가 모두 있는지까지 확인한다.
    const aliasTokens = collectMatchTokens(alias)

    return (
      aliasTokens.length > 1 &&
      aliasTokens.every((aliasToken) => {
        return evidenceSearchText.includes(aliasToken)
      })
    )
  })
}

function collectMatchTokens(alias: string): string[] {
  return [
    ...new Set(
      (alias.match(CHAT_CONCEPT_TOKEN_PATTERN) ?? [])
        .map((token) => normalizeConceptText(token))
        .filter((token) => {
          return (
            token.length >=
            CHAT_CONCEPT_NORMALIZATION.MINIMUM_MATCH_TOKEN_LENGTH
          )
        }),
    ),
  ]
}

const CHAT_CONCEPT_PRESENCE = {
  MATCHED: 'matched',
  PARTIAL: 'partial',
  ABSENT: 'absent',
} as const

type ChatConceptPresence =
  (typeof CHAT_CONCEPT_PRESENCE)[keyof typeof CHAT_CONCEPT_PRESENCE]

function resolveChatConceptPresence(params: {
  concept: string
  records: ChatEvidenceRecord[]
}): ChatConceptPresence {
  if (
    params.records.some((record) => {
      return doesChatEvidenceMatchConcept(record, params.concept)
    })
  ) {
    return CHAT_CONCEPT_PRESENCE.MATCHED
  }

  const conceptTokens = buildRawConceptAliases(params.concept).flatMap(
    (alias) => {
      return collectMatchTokens(alias)
    },
  )
  const hasTokenMatch = params.records.some((record) => {
    const evidenceSearchText = buildEvidenceSearchText(record)

    return conceptTokens.some((conceptToken) => {
      return evidenceSearchText.includes(conceptToken)
    })
  })

  return hasTokenMatch
    ? CHAT_CONCEPT_PRESENCE.PARTIAL
    : CHAT_CONCEPT_PRESENCE.ABSENT
}

/**
 * 필수 개념마다 근거 충족을 요구하면, 질문에 쓴 표현이 말뭉치 표기와 어긋나기만 해도
 * 답할 수 있는 질문이 검색 단계에서 거절된다. 말뭉치가 일부만 아는 표현은 선택 개념으로
 * 내리고, 아무것도 아는 게 없는 표현만 필수로 남겨 근거 없는 답변을 막는다.
 */
export function selectEnforceableChatConcepts(params: {
  concepts: string[]
  records: ChatEvidenceRecord[]
}): string[] {
  const conceptPresences = params.concepts.map((concept) => {
    return {
      concept,
      presence: resolveChatConceptPresence({ concept, records: params.records }),
    }
  })
  const matchedConcepts = conceptPresences.filter((entry) => {
    return entry.presence === CHAT_CONCEPT_PRESENCE.MATCHED
  })

  if (matchedConcepts.length > 0) {
    return matchedConcepts.map((entry) => entry.concept)
  }

  const hasPartialConcept = conceptPresences.some((entry) => {
    return entry.presence === CHAT_CONCEPT_PRESENCE.PARTIAL
  })

  return hasPartialConcept ? [] : params.concepts
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
