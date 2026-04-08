import { describe, expect, it } from 'vitest'
import { selectBlogSearchMatches } from './blog-search'
import type { BlogSearchRecord } from '@/entities/post/model/search-types'

const BLOG_SEARCH_RECORDS: BlogSearchRecord[] = [
  {
    id: 'ko/react-query-guide/intro',
    locale: 'ko',
    slug: 'react-query-guide',
    title: 'React Query 가이드',
    url: '/ko/blog/react-query-guide',
    excerpt: 'React Query를 왜 쓰는지 설명합니다.',
    content:
      'React Query는 서버 상태 관리 라이브러리입니다. 캐시와 재요청 제어를 제공합니다.',
    sectionTitle: null,
    tags: ['react-query', 'tanstack-query'],
    searchTerms: [],
  },
  {
    id: 'ko/react-query-guide/staletime',
    locale: 'ko',
    slug: 'react-query-guide',
    title: 'React Query 가이드',
    url: '/ko/blog/react-query-guide#staletime-설정',
    excerpt: 'staleTime으로 재요청 빈도를 조절합니다.',
    content:
      'staleTime 설정은 데이터를 신선한 상태로 간주하는 시간을 늘려 불필요한 재요청을 줄입니다.',
    sectionTitle: 'staleTime 설정',
    tags: ['react-query', 'tanstack-query'],
    searchTerms: [],
  },
  {
    id: 'ko/dockerize-nest/intro',
    locale: 'ko',
    slug: 'dockerize-nest',
    title: 'NestJS Docker 배포',
    url: '/ko/blog/dockerize-nest',
    excerpt: 'NestJS를 Docker로 배포하는 방법입니다.',
    content: 'Dockerfile과 docker compose를 이용해 NestJS 앱을 배포합니다.',
    sectionTitle: null,
    tags: ['nestjs', 'docker'],
    searchTerms: [],
  },
]

describe('selectBlogSearchMatches', () => {
  it('질문과 직접 맞는 섹션을 상단에 배치한다', () => {
    const result = selectBlogSearchMatches({
      question: 'React Query에서 staleTime은 왜 필요한가요?',
      locale: 'ko',
      records: BLOG_SEARCH_RECORDS,
    })

    expect(result.grounded).toBe(true)
    expect(result.matches[0]?.url).toBe('/ko/blog/react-query-guide#staletime-설정')
    expect(result.matches).toHaveLength(2)
  })

  it('관련성이 낮으면 grounded를 false로 반환한다', () => {
    const result = selectBlogSearchMatches({
      question: '어제 축구 경기 어땠나요?',
      locale: 'ko',
      records: BLOG_SEARCH_RECORDS,
    })

    expect(result.grounded).toBe(false)
    expect(result.matches).toEqual([])
    expect(result.refusalReason).toBe('insufficient_search_match')
  })

  it('용어가 직접 일치하지 않아도 같은 개념의 섹션을 top-k에 포함한다', () => {
    const records: BlogSearchRecord[] = [
      {
        id: 'ko/optimistic-update/intro',
        locale: 'ko',
        slug: 'optimistic-update',
        title: 'react query를 사용한 낙관적 업데이트',
        url: '/ko/blog/optimistic-update',
        excerpt: 'useMutation과 react-query를 사용합니다.',
        content:
          '사용자가 좋아요 버튼을 누르면 useMutation을 통해 API를 호출합니다.',
        sectionTitle: 'react-query 낙관적 업데이트',
        tags: ['react-query', 'optimistic update'],
        searchTerms: [],
      },
      {
        id: 'ko/why-use-react-query/intro',
        locale: 'ko',
        slug: 'why-use-react-query',
        title: 'react-query 도대체 왜 사용하는 걸까?',
        url: '/ko/blog/why-use-react-query#react-query-왜-사용할까',
        excerpt: 'react-query는 비동기 데이터 관리와 캐시에 도움을 줍니다.',
        content: 'react-query는 비동기 데이터를 관리하고 캐시합니다.',
        sectionTitle: 'react-query 왜 사용할까?',
        tags: ['react', 'react-query'],
        searchTerms: [],
      },
      {
        id: 'ko/why-use-react-query/conclusion',
        locale: 'ko',
        slug: 'why-use-react-query',
        title: 'react-query 도대체 왜 사용하는 걸까?',
        url: '/ko/blog/why-use-react-query#결론',
        excerpt: '쿼리 옵션에 따라 데이터를 자동으로 페칭하거나 유효 기간을 정할 수 있습니다.',
        content:
          '쿼리옵션에 따라 데이터를 자동적으로 페칭하거나 유효 기간을 정할 수 있습니다.',
        sectionTitle: '결론',
        tags: ['react', 'react-query'],
        searchTerms: [],
      },
    ]

    const result = selectBlogSearchMatches({
      question: 'React Query에서 staleTime은 왜 중요한가요?',
      locale: 'ko',
      records,
    })

    expect(result.grounded).toBe(true)
    expect(result.matches[0]?.url).toBe('/ko/blog/why-use-react-query#결론')
  })

  it('단일 키워드 질의도 정확히 일치하면 반환한다', () => {
    const records: BlogSearchRecord[] = [
      {
        id: 'ko/why-i-built-lee-spec-kit/intro',
        locale: 'ko',
        slug: 'why-i-built-lee-spec-kit',
        title: 'AI 시대의 개발 생산성은 코드보다 구조에 달려 있다: lee-spec-kit을 만든 이유',
        url: '/ko/blog/why-i-built-lee-spec-kit#intro',
        excerpt: '하네스의 품질이 AI 협업 안정성에 영향을 준다고 설명합니다.',
        content:
          '결국 AI의 성능은 모델 자체만이 아니라, 그 모델이 일하는 환경, 즉 하네스의 품질에 크게 좌우됩니다.',
        sectionTitle: 'AI 시대의 개발 생산성은 코드보다 구조에 달려 있다',
        tags: ['lee-spec-kit'],
        searchTerms: [],
      },
    ]

    const result = selectBlogSearchMatches({
      question: '하네스',
      locale: 'ko',
      records,
    })

    expect(result.grounded).toBe(true)
    expect(result.matches[0]?.slug).toBe('why-i-built-lee-spec-kit')
  })

  it('현재 보고 있는 글 컨텍스트가 있으면 지시어 질문에 현재 글을 우선한다', () => {
    const records: BlogSearchRecord[] = [
      {
        id: 'ko/why-i-built-lee-spec-kit/intro',
        locale: 'ko',
        slug: 'why-i-built-lee-spec-kit',
        title: 'AI 시대의 개발 생산성은 코드보다 구조에 달려 있다: lee-spec-kit을 만든 이유',
        url: '/ko/blog/why-i-built-lee-spec-kit',
        excerpt: 'lee-spec-kit을 만든 이유를 설명합니다.',
        content:
          'lee-spec-kit은 AI 보조 개발을 위한 문서 구조와 워크플로우를 정리하기 위해 만든 CLI입니다.',
        sectionTitle: null,
        tags: ['lee-spec-kit'],
        searchTerms: [],
      },
      {
        id: 'ko/leemage-case-study/intro',
        locale: 'ko',
        slug: 'leemage-case-study',
        title: '비용 문제에서 시작해 파일 관리 플랫폼이 된 Leemage 제작기',
        url: '/ko/blog/leemage-case-study',
        excerpt: 'Leemage 제작기',
        content: 'Leemage는 비용 절감을 위한 파일 관리 플랫폼입니다.',
        sectionTitle: null,
        tags: ['leemage'],
        searchTerms: [],
      },
    ]

    const result = selectBlogSearchMatches({
      question: '이 도구를 짧게 소개해줘',
      locale: 'ko',
      records,
      currentPostSlug: 'why-i-built-lee-spec-kit',
    })

    expect(result.grounded).toBe(true)
    expect(result.matches[0]?.slug).toBe('why-i-built-lee-spec-kit')
  })
})
