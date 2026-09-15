import { describe, expect, it } from 'vitest'
import { finalizeBlogChatResponse } from './blog-chat-response'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'

const BLOG_SEARCH_MATCHES: ChatEvidenceRecord[] = [
  {
    id: 'ko/react-query-guide/staletime',
    locale: 'ko',
    slug: 'react-query-guide',
    title: 'React Query 가이드',
    url: '/ko/blog/react-query-guide#staletime-설정',
    excerpt: 'staleTime 설정은 재요청을 줄이는 데 도움을 줍니다.',
    content: 'staleTime 설정은 데이터를 신선하게 보는 시간을 늘립니다.',
    sectionTitle: 'staleTime 설정',
    tags: ['react-query'],
    sourceCategory: 'blog',
  },
  {
    id: 'ko/react-query-guide/intro',
    locale: 'ko',
    slug: 'react-query-guide',
    title: 'React Query 가이드',
    url: '/ko/blog/react-query-guide',
    excerpt: 'React Query 소개',
    content: 'React Query는 서버 상태 관리 라이브러리입니다.',
    sectionTitle: null,
    tags: ['react-query'],
    sourceCategory: 'blog',
  },
]

describe('finalizeBlogChatResponse', () => {
  it('내부 근거 ID는 공개 제목으로 바꾸고 출처 URL은 보존한다', () => {
    const evidence = {
      ...BLOG_SEARCH_MATCHES[0],
      id: 'en/example/part.v2',
      title: 'Example source',
      url: '/en/example/part.v2',
    }
    const result = finalizeBlogChatResponse({
      locale: 'en',
      matches: [evidence],
      draftAnswer: {
        answer: `The source is [${evidence.id}]. URL: ${evidence.url}. Unrelated: en/example/partXv2.`,
        usedCitationUrls: [evidence.url],
        refusalReason: null,
      },
    })
    expect(result.answer).toBe(
      'The source is [Example source]. URL: /en/example/part.v2. Unrelated: en/example/partXv2.',
    )
    expect(result.citations[0].url).toBe(evidence.url)
  })

  it('겹치는 ID와 마크다운으로 감싼 ID도 공개 제목으로 바꾼다', () => {
    const evidence = {
      ...BLOG_SEARCH_MATCHES[0],
      id: 'curated/example',
      title: 'Short title',
    }
    const detail = {
      ...evidence,
      id: 'curated/example/detail',
      title: 'Detailed title',
    }
    const result = finalizeBlogChatResponse({
      locale: 'ko',
      matches: [evidence, detail],
      draftAnswer: {
        answer: `\`${detail.id}\`와 ${evidence.id}입니다.`,
        usedCitationUrls: [evidence.url],
        refusalReason: null,
      },
    })
    expect(result.answer).toBe('Detailed title와 Short title입니다.')
  })
  it('검색 결과 안에 있는 citation만 통과시킨다', () => {
    const result = finalizeBlogChatResponse({
      locale: 'ko',
      draftAnswer: {
        answer:
          'staleTime을 늘리면 데이터를 신선한 것으로 간주하는 시간이 길어져 불필요한 재요청을 줄일 수 있습니다.',
        usedCitationUrls: ['/ko/blog/react-query-guide#staletime-설정'],
        refusalReason: null,
      },
      matches: BLOG_SEARCH_MATCHES,
    })

    expect(result.grounded).toBe(true)
    expect(result.citations).toEqual([
      {
        title: 'React Query 가이드',
        url: '/ko/blog/react-query-guide#staletime-설정',
        sectionTitle: 'staleTime 설정',
        sourceCategory: 'blog',
      },
    ])
  })

  it('모델 답변에 포함된 마크다운 문법은 평문으로 정리한다', () => {
    const result = finalizeBlogChatResponse({
      locale: 'ko',
      draftAnswer: {
        answer: [
          '## 핵심 요약',
          '',
          '**staleTime**을 늘리면 `React Query`가 데이터를 더 오래 fresh 상태로 봅니다.',
          '- 불필요한 재요청을 줄일 수 있습니다.',
          '- [출처](/ko/blog/react-query-guide)를 함께 확인할 수 있습니다.',
          '',
          '```ts',
          'const staleTime = 1_000',
          '```',
        ].join('\n'),
        usedCitationUrls: ['/ko/blog/react-query-guide#staletime-설정'],
        refusalReason: null,
      },
      matches: BLOG_SEARCH_MATCHES,
    })

    expect(result.grounded).toBe(true)
    expect(result.answer).toBe(
      [
        '핵심 요약',
        '',
        'staleTime을 늘리면 React Query가 데이터를 더 오래 fresh 상태로 봅니다.',
        '불필요한 재요청을 줄일 수 있습니다.',
        '출처를 함께 확인할 수 있습니다.',
        '',
        'const staleTime = 1_000',
      ].join('\n'),
    )
  })

  it('snake_case 식별자는 강조 문법으로 오인하지 않고 유지한다', () => {
    const result = finalizeBlogChatResponse({
      locale: 'ko',
      draftAnswer: {
        answer:
          '설정 키로 NEXT_PUBLIC_GISCUS_REPO 와 current_post_slug 같은 값을 그대로 안내합니다.',
        usedCitationUrls: ['/ko/blog/react-query-guide#staletime-설정'],
        refusalReason: null,
      },
      matches: BLOG_SEARCH_MATCHES,
    })

    expect(result.grounded).toBe(true)
    expect(result.answer).toBe(
      '설정 키로 NEXT_PUBLIC_GISCUS_REPO 와 current_post_slug 같은 값을 그대로 안내합니다.',
    )
  })

  it('검색 결과에 없는 citation이면 안전하게 거절한다', () => {
    const result = finalizeBlogChatResponse({
      locale: 'ko',
      draftAnswer: {
        answer: '외부 정보로 추정한 답변입니다.',
        usedCitationUrls: ['/ko/blog/unknown-post'],
        refusalReason: null,
      },
      matches: BLOG_SEARCH_MATCHES,
    })

    expect(result.grounded).toBe(false)
    expect(result.answer).toBe('답변을 뒷받침할 근거를 확인할 수 없어요.')
    expect(result.refusalReason).toBe('invalid_citations')
  })
})
