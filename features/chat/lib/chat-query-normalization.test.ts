import { describe, expect, it } from 'vitest'
import { normalizeChatQuery } from '@/features/chat/lib/chat-query-normalization'

describe('normalizeChatQuery', () => {
  it('질문형 군더더기 표현을 제거한 검색 질의를 만든다', () => {
    const result = normalizeChatQuery({
      question: 'Leesfield 알아?',
      locale: 'ko',
    })

    expect(result.normalizedQuestion).toBe('Leesfield 알아')
    expect(result.normalizedSearchQuestion).toBe('Leesfield')
    expect(result.queryTokens).toEqual(['leesfield'])
  })

  it('source 의미를 추론하지 않고 검색 문자열만 정규화한다', () => {
    const result = normalizeChatQuery({
      question: 'lee-spec-kit 프로젝트 뭐야?',
      locale: 'ko',
    })

    expect(result).toEqual({
      normalizedQuestion: 'lee-spec-kit 프로젝트 뭐야',
      normalizedSearchQuestion: 'lee-spec-kit 프로젝트',
      queryTokens: ['lee-spec-kit', '프로젝트'],
    })
  })
})
