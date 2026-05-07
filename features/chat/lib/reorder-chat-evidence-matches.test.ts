import { describe, expect, it } from 'vitest'
import { reorderChatEvidenceMatches } from '@/features/chat/lib/reorder-chat-evidence-matches'

describe('reorderChatEvidenceMatches', () => {
  it('model이 반환한 evidence id 순서대로 evidence를 재정렬한다', () => {
    const reorderedMatches = reorderChatEvidenceMatches({
      matches: [
        {
          id: 'profile',
          locale: 'ko',
          slug: 'about',
          title: 'About Me',
          url: '/ko/about',
          excerpt: '소개',
          content: '소개',
          sectionTitle: null,
          tags: ['about'],
          sourceCategory: 'profile',
        },
        {
          id: 'blog',
          locale: 'ko',
          slug: 'nivo-chart',
          title: 'nivo chart로 데이터 시각화하기',
          url: '/ko/blog/nivo-chart',
          excerpt: 'nivo',
          content: 'nivo',
          sectionTitle: null,
          tags: ['nivo'],
          sourceCategory: 'blog',
        },
      ],
      rankedEvidenceIds: ['blog', 'profile'],
    })

    expect(reorderedMatches.map((match) => match.id)).toEqual(['blog', 'profile'])
  })

  it('같은 url을 공유하는 section evidence도 id로 구분한다', () => {
    const reorderedMatches = reorderChatEvidenceMatches({
      matches: [
        {
          id: 'ko/about/introduction',
          locale: 'ko',
          slug: 'about',
          title: 'About Me',
          url: '/ko/about',
          excerpt: '소개',
          content: '소개',
          sectionTitle: null,
          tags: ['about'],
          sourceCategory: 'profile',
        },
        {
          id: 'ko/about/profile-tech-stack',
          locale: 'ko',
          slug: 'about',
          title: 'About Me',
          url: '/ko/about',
          excerpt: '주력 기술 스택',
          content: 'Next.js TypeScript PostgreSQL',
          sectionTitle: '주력 기술 스택',
          tags: ['tech-stack'],
          sourceCategory: 'profile',
        },
      ],
      rankedEvidenceIds: ['ko/about/profile-tech-stack'],
    })

    expect(reorderedMatches[0]?.id).toBe('ko/about/profile-tech-stack')
  })
})
