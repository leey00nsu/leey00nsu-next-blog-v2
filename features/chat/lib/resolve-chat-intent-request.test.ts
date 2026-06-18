import { describe, expect, it } from 'vitest'
import { resolveChatIntentRequest } from '@/features/chat/lib/resolve-chat-intent-request'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import type { NormalizedChatIntent } from '@/features/chat/model/chat-intent'

const BLOG_RECORDS: ChatEvidenceRecord[] = [
  {
    id: 'ko/blog/oldest',
    locale: 'ko',
    slug: 'oldest',
    title: '오래된 글',
    url: '/ko/blog/oldest',
    excerpt: '오래된 글',
    content: '오래된 글 내용',
    sectionTitle: null,
    tags: [],
    publishedAt: '2024-01-02T00:00:00.000Z',
    sourceCategory: 'blog',
  },
  {
    id: 'ko/blog/latest',
    locale: 'ko',
    slug: 'latest',
    title: '최신 글',
    url: '/ko/blog/latest',
    excerpt: '최신 글',
    content: '최신 글 내용',
    sectionTitle: null,
    tags: [],
    publishedAt: '2026-04-21T00:00:00.000Z',
    sourceCategory: 'blog',
  },
  {
    id: 'ko/blog/vercel',
    locale: 'ko',
    slug: 'vercel',
    title: 'Vercel 사용 경험',
    url: '/ko/blog/vercel',
    excerpt: 'Vercel 배포 경험',
    content: '정적 페이지는 Vercel을 통해 배포했습니다.',
    sectionTitle: null,
    tags: ['vercel'],
    publishedAt: '2025-01-01T00:00:00.000Z',
    sourceCategory: 'blog',
  },
]

const BASE_INTENT: NormalizedChatIntent = {
  standaloneQuestion: '블로그에 관해 알려주세요.',
  operation: 'answer',
  target: {
    kind: 'none',
    sourceCategory: null,
    slug: null,
    title: null,
  },
  temporalConstraint: { order: 'none' },
  requestedFields: ['content'],
  evidenceScope: 'corpus',
  requiredConcepts: [],
  optionalConcepts: [],
  missingSlots: [],
  clarificationQuestion: null,
  confidence: 'high',
  reason: 'Complete intent.',
}

describe('resolveChatIntentRequest', () => {
  it('published_at 필드가 있으면 최신 글 제목과 게시일을 직접 반환한다', () => {
    const result = resolveChatIntentRequest({
      intent: {
        ...BASE_INTENT,
        temporalConstraint: { order: 'latest' },
        requestedFields: ['title', 'published_at'],
      },
      locale: 'ko',
      blogRecords: BLOG_RECORDS,
      curatedRecords: [],
    })

    expect(result.shouldCallModel).toBe(false)
    expect(result.directResponse?.answer).toBe(
      '최신 글은 2026년 4월 21일에 게시된 최신 글입니다.',
    )
  })

  it('published_at 필드가 없으면 질문 표현과 관계없이 날짜를 제외한다', () => {
    const result = resolveChatIntentRequest({
      intent: {
        ...BASE_INTENT,
        standaloneQuestion: '최신 글이 올라온 날을 알려줘.',
        temporalConstraint: { order: 'latest' },
        requestedFields: ['title'],
      },
      locale: 'ko',
      blogRecords: BLOG_RECORDS,
      curatedRecords: [],
    })

    expect(result.directResponse?.answer).toBe('최신 글은 최신 글입니다.')
  })

  it('최신 글 요약은 최신 글을 근거로 모델 호출을 요청한다', () => {
    const result = resolveChatIntentRequest({
      intent: {
        ...BASE_INTENT,
        operation: 'summarize',
        temporalConstraint: { order: 'latest' },
        requestedFields: ['summary'],
      },
      locale: 'ko',
      blogRecords: BLOG_RECORDS,
      curatedRecords: [],
    })

    expect(result.shouldCallModel).toBe(true)
    expect(result.matches.map((match) => match.slug)).toEqual(['latest'])
  })

  it('필수 개념을 포함한 근거가 없으면 검색 부족을 반환한다', () => {
    const result = resolveChatIntentRequest({
      intent: {
        ...BASE_INTENT,
        requiredConcepts: ['Cloudflare'],
      },
      locale: 'ko',
      blogRecords: BLOG_RECORDS,
      curatedRecords: [],
    })

    expect(result).toMatchObject({
      shouldCallModel: false,
      matches: [],
      refusalReason: 'insufficient_search_match',
    })
  })

  it('현재 글 범위에서는 지정된 slug 근거만 반환한다', () => {
    const result = resolveChatIntentRequest({
      intent: {
        ...BASE_INTENT,
        operation: 'explain',
        target: {
          kind: 'current_source',
          sourceCategory: 'blog',
          slug: null,
          title: null,
        },
        evidenceScope: 'current_source',
      },
      locale: 'ko',
      blogRecords: BLOG_RECORDS,
      curatedRecords: [],
      currentPostSlug: 'vercel',
    })

    expect(result.shouldCallModel).toBe(true)
    expect(result.matches.map((match) => match.slug)).toEqual(['vercel'])
  })
})
