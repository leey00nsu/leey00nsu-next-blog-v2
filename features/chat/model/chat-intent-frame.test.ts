import { describe, expect, it } from 'vitest'
import { ChatIntentFrameSchema } from './chat-intent-frame'

describe('ChatIntentFrameSchema', () => {
  it('최신 글의 게시일을 묻는 의미 구조를 파싱한다', () => {
    const result = ChatIntentFrameSchema.parse({
      standaloneQuestion: '블로그의 최신 글은 언제 게시되었나요?',
      domain: 'blog',
      operation: 'answer',
      target: {
        kind: 'none',
        sourceCategory: null,
        slug: null,
        title: null,
        confidence: 'high',
      },
      temporalConstraint: {
        order: 'latest',
      },
      requestedFields: ['title', 'published_at'],
      evidenceScope: 'corpus',
      searchConcepts: {
        required: [],
        optional: [],
      },
      missingSlots: [],
      clarificationQuestion: null,
      confidence: 'high',
      reason: 'The user asks for the publication date of the latest post.',
    })

    expect(result.temporalConstraint.order).toBe('latest')
    expect(result.requestedFields).toContain('published_at')
  })

  it('작성자의 특정 기술 사용 경험과 필수 검색 개념을 표현한다', () => {
    const result = ChatIntentFrameSchema.parse({
      standaloneQuestion: '블로그 작성자 이윤수가 Vercel을 사용해 봤나요?',
      domain: 'profile',
      operation: 'answer',
      target: {
        kind: 'profile',
        sourceCategory: 'profile',
        slug: null,
        title: '이윤수',
        confidence: 'high',
      },
      temporalConstraint: {
        order: 'none',
      },
      requestedFields: ['content'],
      evidenceScope: 'entity',
      searchConcepts: {
        required: ['Vercel'],
        optional: ['배포', 'Next.js'],
      },
      missingSlots: [],
      clarificationQuestion: null,
      confidence: 'high',
      reason: 'The author and technology are resolved from context.',
    })

    expect(result.target.kind).toBe('profile')
    expect(result.searchConcepts.required).toEqual(['Vercel'])
  })
})
