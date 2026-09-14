import { describe, expect, it } from 'vitest'
import { matchGraphRagEntityIds } from '@/features/chat/lib/match-graph-rag-entities'
import type { GraphRagEntity } from '@/features/chat/model/graph-rag'
import { collectSearchTerms } from '@/shared/lib/search-terms'

function buildEntity(name: string): GraphRagEntity {
  const normalizedName = name.trim().toLowerCase()

  return {
    id: `ko:term:${normalizedName}`,
    locale: 'ko',
    name,
    normalizedName,
    kind: 'term',
    chunkIds: [],
  }
}

function collectQuestionTerms(question: string): string[] {
  return collectSearchTerms({ texts: [question] })
}

describe('matchGraphRagEntityIds', () => {
  it('짧은 entity가 다른 단어 안에 포함되어도 매칭하지 않는다', () => {
    const matchedEntityIds = matchGraphRagEntityIds({
      entities: [buildEntity('AI')],
      questionTerms: ['training', 'detail', 'rails'],
    })

    expect(matchedEntityIds.size).toBe(0)
  })

  it('같은 토큰이면 매칭한다', () => {
    const matchedEntityIds = matchGraphRagEntityIds({
      entities: [buildEntity('AI')],
      questionTerms: collectQuestionTerms('AI를 어떻게 활용했어?'),
    })

    expect(matchedEntityIds.has('ko:term:ai')).toBe(true)
  })

  it('한국어 조사가 붙은 질문 토큰도 매칭한다', () => {
    const matchedEntityIds = matchGraphRagEntityIds({
      entities: [buildEntity('경력')],
      questionTerms: collectQuestionTerms('경력은 어떻게 되나요'),
    })

    expect(matchedEntityIds.has('ko:term:경력')).toBe(true)
  })

  it('표기가 다른 기술명은 질문 용어 확장으로 매칭한다', () => {
    const matchedEntityIds = matchGraphRagEntityIds({
      entities: [buildEntity('next.js')],
      questionTerms: collectQuestionTerms('nextjs로 만들었어?'),
    })

    expect(matchedEntityIds.has('ko:term:next.js')).toBe(true)
  })

  it('제목처럼 긴 entity도 겹치는 토큰이 있으면 매칭한다', () => {
    const matchedEntityIds = matchGraphRagEntityIds({
      entities: [buildEntity('nivo chart로 데이터 시각화하기')],
      questionTerms: collectQuestionTerms('nivo 차트 쓴 적 있어?'),
    })

    expect(matchedEntityIds.has('ko:term:nivo chart로 데이터 시각화하기')).toBe(
      true,
    )
  })

  it('겹치는 토큰이 없으면 매칭하지 않는다', () => {
    const matchedEntityIds = matchGraphRagEntityIds({
      entities: [buildEntity('PostgreSQL')],
      questionTerms: collectQuestionTerms('nivo 차트 쓴 적 있어?'),
    })

    expect(matchedEntityIds.size).toBe(0)
  })
})
