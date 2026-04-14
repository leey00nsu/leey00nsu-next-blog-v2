import { describe, expect, it } from 'vitest'
import { buildFollowUpSuggestions } from '@/features/chat/lib/build-follow-up-suggestions'

describe('buildFollowUpSuggestions', () => {
  it('응답 근거와 태그를 기반으로 후속 질문을 만든다', () => {
    const suggestions = buildFollowUpSuggestions({
      locale: 'ko',
      citations: [
        {
          title: 'nivo chart로 데이터 시각화하기',
          url: '/ko/blog/nivo-chart',
          sectionTitle: null,
          sourceCategory: 'blog',
        },
      ],
      matches: [
        {
          id: 'ko/blog/nivo-chart',
          locale: 'ko',
          slug: 'nivo-chart',
          title: 'nivo chart로 데이터 시각화하기',
          url: '/ko/blog/nivo-chart',
          excerpt: 'nivo를 다룹니다.',
          content: 'nivo를 다룹니다.',
          sectionTitle: null,
          tags: ['nivo', 'chart'],
          searchTerms: ['nivo'],
          publishedAt: '2026-04-01T00:00:00.000Z',
          sourceCategory: 'blog',
        },
      ],
    })

    expect(suggestions).toEqual(
      expect.arrayContaining([
        'nivo chart로 데이터 시각화하기 글의 핵심 내용을 요약해줘',
        'nivo 관련 글도 추천해줘',
      ]),
    )
  })
})
