import { describe, expect, it } from 'vitest'
import { reorderChatEvidenceMatches } from '@/features/chat/lib/reorder-chat-evidence-matches'

describe('reorderChatEvidenceMatches', () => {
  it('model이 반환한 url 순서대로 evidence를 재정렬한다', () => {
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
      rankedUrls: ['/ko/blog/nivo-chart', '/ko/about'],
    })

    expect(reorderedMatches.map((match) => match.url)).toEqual([
      '/ko/blog/nivo-chart',
      '/ko/about',
    ])
  })
})
