import { describe, expect, it } from 'vitest'
import { analyzeQuestion } from './question-analysis'

describe('analyzeQuestion', () => {
  it('인사형 질문은 greeting으로 분류한다', () => {
    const result = analyzeQuestion('안녕, 너 뭐 하는 챗봇이야?')

    expect(result.questionType).toBe('greeting')
    expect(result.normalizedQuestion).toBe('안녕 너 뭐 하는 챗봇이야')
    expect(result.searchQueries).toEqual([])
  })

  it('챗봇 정체 질문은 analyze 단계에서는 general로 남긴다', () => {
    const result = analyzeQuestion('넌 뭐야?')

    expect(result.questionType).toBe('general')
    expect(result.searchQueries).toEqual([
      {
        question: '넌 뭐야',
        intent: 'general',
        additionalKeywords: [],
        preferredSourceCategories: [],
      },
    ])
  })

  it('챗봇 관계 질문도 analyze 단계에서는 general로 남긴다', () => {
    const result = analyzeQuestion('넌 이 사람이랑 어떤 관계야?')

    expect(result.questionType).toBe('general')
    expect(result.searchQueries).toEqual([
      {
        question: '넌 이 사람이랑 어떤 관계야',
        intent: 'general',
        additionalKeywords: [],
        preferredSourceCategories: [],
      },
    ])
  })

  it('프로필과 프로젝트 의도가 함께 있으면 검색 질의를 분해한다', () => {
    const result = analyzeQuestion(
      '이 사람은 어떤 개발자고 대표 프로젝트는 뭐야?',
    )

    expect(result.questionType).toBe('general')
    expect(result.searchQueries).toEqual([
      {
        question: '이 사람은 어떤 개발자고 대표 프로젝트는 뭐야',
        intent: 'general',
        additionalKeywords: [],
        preferredSourceCategories: [],
      },
    ])
  })

  it('기술 질문은 접속사 기준으로 최대 두 개까지 분해한다', () => {
    const result = analyzeQuestion(
      '왜 Next.js를 선택했고 이미지 최적화는 어떻게 했어?',
    )

    expect(result.questionType).toBe('general')
    expect(result.searchQueries.map((query) => query.question)).toEqual([
      '왜 Next.js를 선택',
      '이미지 최적화는 어떻게 했어',
    ])
  })

  it('학력 질문도 general retrieval로 넘긴다', () => {
    const result = analyzeQuestion('어떤 대학 출신이야?')

    expect(result.questionType).toBe('general')
    expect(result.searchQueries[0]?.intent).toBe('general')
  })

  it('경력 질문도 general retrieval로 넘긴다', () => {
    const result = analyzeQuestion('어디서 일했고 어떤 업무를 했어?')

    expect(result.questionType).toBe('general')
    expect(result.searchQueries[0]?.intent).toBe('general')
  })

  it('기술 스택 질문도 general retrieval로 넘긴다', () => {
    const result = analyzeQuestion('주력 기술 스택이 뭐야?')

    expect(result.questionType).toBe('general')
    expect(result.searchQueries[0]?.intent).toBe('general')
  })

  it('영문 질문의 일부 문자열 때문에 greeting으로 오분류하지 않는다', () => {
    const result = analyzeQuestion('Which project uses TypeScript?')

    expect(result.questionType).toBe('general')
    expect(result.searchQueries).toEqual([
      {
        question: 'Which project uses TypeScript',
        intent: 'general',
        additionalKeywords: [],
        preferredSourceCategories: [],
      },
    ])
  })
})
