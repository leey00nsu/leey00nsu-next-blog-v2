import { describe, expect, it } from 'vitest'
import { selectChatSearchMatches } from '@/features/chat/lib/chat-search'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'

describe('selectChatSearchMatches', () => {
  it('searchTerms에 있는 영문 확장어로도 근거를 찾는다', () => {
    const records: ChatEvidenceRecord[] = [
      {
        id: 'ko/about/profile',
        locale: 'ko',
        slug: 'about',
        title: '소개',
        url: '/ko/about',
        excerpt: '프론트엔드 개발자',
        content: '주로 리액트와 타입스크립트를 사용합니다.',
        sectionTitle: null,
        tags: ['소개', '개발자'],
        searchTerms: ['tech stack', 'typescript', 'react'],
        sourceCategory: 'profile',
      },
    ]

    const result = selectChatSearchMatches({
      question: 'What tech stack do you use?',
      locale: 'ko',
      records,
    })

    expect(result.grounded).toBe(true)
    expect(result.matches[0]?.sourceCategory).toBe('profile')
  })

  it('최신 회고 추천 질문은 날짜가 더 최신인 글을 우선 반환한다', () => {
    const records: ChatEvidenceRecord[] = [
      {
        id: 'ko/blog/old-retrospect',
        locale: 'ko',
        slug: 'old-retrospect',
        title: '밥 한끼 하자 회고',
        url: '/ko/blog/old-retrospect',
        excerpt: '오래된 회고',
        content: '첫 팀 프로젝트를 마친 회고입니다.',
        sectionTitle: null,
        tags: ['회고'],
        publishedAt: '2023-01-28T00:00:00.000Z',
        searchTerms: ['회고 글 추천해줘'],
        sourceCategory: 'blog',
      },
      {
        id: 'ko/blog/latest-retrospect',
        locale: 'ko',
        slug: 'latest-retrospect',
        title: '그저 그런 개발자로 1년간 살아남기',
        url: '/ko/blog/latest-retrospect',
        excerpt: '가장 최신 회고',
        content: '실무 1년을 돌아보는 회고입니다.',
        sectionTitle: null,
        tags: ['회고'],
        publishedAt: '2026-02-07T00:00:00.000Z',
        searchTerms: ['회고 글 추천해줘'],
        sourceCategory: 'blog',
      },
    ]

    const result = selectChatSearchMatches({
      question: '최신 회고 글 추천해달라',
      locale: 'ko',
      records,
    })

    expect(result.grounded).toBe(true)
    expect(result.matches[0]?.slug).toBe('latest-retrospect')
  })
})
