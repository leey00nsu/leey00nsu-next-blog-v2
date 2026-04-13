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

  it('프로젝트 힌트를 source category와 추가 키워드로 변환한다', () => {
    const result = normalizeChatQuery({
      question: 'lee-spec-kit 프로젝트 뭐야?',
      locale: 'ko',
    })

    expect(result.preferredSourceCategories).toEqual(['project'])
    expect(result.additionalKeywords).toEqual(
      expect.arrayContaining(['project', 'projects', '프로젝트']),
    )
    expect(result.normalizedSearchQuestion).toBe('lee-spec-kit 프로젝트')
  })

  it('블로그 관련 질문은 blog source category를 우선한다', () => {
    const result = normalizeChatQuery({
      question: 'React 관련 글 추천해줘',
      locale: 'ko',
    })

    expect(result.preferredSourceCategories).toEqual(['blog'])
    expect(result.additionalKeywords).toEqual(
      expect.arrayContaining(['blog', 'post', 'posts']),
    )
  })
})
