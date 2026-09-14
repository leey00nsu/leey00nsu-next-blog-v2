import { BLOG_CHAT } from '@/features/chat/config/constants'
import type { GraphRagEntity } from '@/features/chat/model/graph-rag'
import { collectSearchTerms } from '@/shared/lib/search-terms'

interface MatchGraphRagEntityIdsParams {
  entities: GraphRagEntity[]
  questionTerms: string[]
}

function stripKoreanParticleSuffix(term: string): string {
  return term.replace(BLOG_CHAT.SEARCH.KOREAN_PARTICLE_SUFFIX_PATTERN, '')
}

/**
 * 질문 용어와 이름이 겹치는 graph entity id를 고른다.
 *
 * 이름 전체를 부분 문자열로 비교하면 'ai' 같은 짧은 entity가 'training'이나 'detail' 안에서
 * 걸리는 오탐이 생긴다. 그래서 양쪽을 같은 규칙으로 토큰화한 뒤 토큰이 정확히 일치할 때만
 * 매칭하고, 한국어 조사가 붙은 토큰은 조사를 떼고 한 번 더 비교한다.
 */
export function matchGraphRagEntityIds({
  entities,
  questionTerms,
}: MatchGraphRagEntityIdsParams): Set<string> {
  const questionTermSet = new Set(questionTerms)
  const particleStrippedQuestionTermSet = new Set(
    questionTerms.map((questionTerm) => {
      return stripKoreanParticleSuffix(questionTerm)
    }),
  )
  const matchedEntityIds = new Set<string>()

  for (const entity of entities) {
    const entityTerms = collectSearchTerms({
      texts: [entity.normalizedName],
    })
    const isMatched = entityTerms.some((entityTerm) => {
      return (
        questionTermSet.has(entityTerm) ||
        particleStrippedQuestionTermSet.has(entityTerm)
      )
    })

    if (isMatched) {
      matchedEntityIds.add(entity.id)
    }
  }

  return matchedEntityIds
}
