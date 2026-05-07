import { describe, expect, it } from 'vitest'
import { selectChatSearchMatches } from '@/features/chat/lib/chat-search'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'

describe('selectChatSearchMatches', () => {
  it('질문과 직접 맞는 블로그 섹션을 상단에 배치한다', () => {
    const records: ChatEvidenceRecord[] = [
      {
        id: 'ko/blog/react-query-guide/intro',
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
        sourceCategory: 'blog',
      },
      {
        id: 'ko/blog/react-query-guide/staletime',
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
        sourceCategory: 'blog',
      },
    ]

    const result = selectChatSearchMatches({
      question: 'React Query에서 staleTime은 왜 필요한가요?',
      locale: 'ko',
      records,
    })

    expect(result.grounded).toBe(true)
    expect(result.matches[0]?.url).toBe('/ko/blog/react-query-guide#staletime-설정')
  })

  it('관련성이 낮으면 grounded를 false로 반환한다', () => {
    const records: ChatEvidenceRecord[] = [
      {
        id: 'ko/blog/react-query-guide/intro',
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
        sourceCategory: 'blog',
      },
    ]

    const result = selectChatSearchMatches({
      question: '어제 축구 경기 어땠나요?',
      locale: 'ko',
      records,
    })

    expect(result.grounded).toBe(false)
    expect(result.matches).toEqual([])
    expect(result.refusalReason).toBe('insufficient_search_match')
  })

  it('용어가 직접 일치하지 않아도 같은 개념의 블로그 섹션을 top-k에 포함한다', () => {
    const records: ChatEvidenceRecord[] = [
      {
        id: 'ko/blog/optimistic-update/intro',
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
        sourceCategory: 'blog',
      },
      {
        id: 'ko/blog/why-use-react-query/conclusion',
        locale: 'ko',
        slug: 'why-use-react-query',
        title: 'react-query 도대체 왜 사용하는 걸까?',
        url: '/ko/blog/why-use-react-query#결론',
        excerpt:
          '쿼리 옵션에 따라 데이터를 자동으로 페칭하거나 유효 기간을 정할 수 있습니다.',
        content:
          '쿼리옵션에 따라 데이터를 자동적으로 페칭하거나 유효 기간을 정할 수 있습니다.',
        sectionTitle: '결론',
        tags: ['react', 'react-query'],
        searchTerms: [],
        sourceCategory: 'blog',
      },
    ]

    const result = selectChatSearchMatches({
      question: 'React Query에서 staleTime은 왜 중요한가요?',
      locale: 'ko',
      records,
    })

    expect(result.grounded).toBe(true)
    expect(result.matches[0]?.url).toBe('/ko/blog/why-use-react-query#결론')
  })

  it('현재 보고 있는 글 컨텍스트가 있으면 지시어 질문에 현재 글을 fallback으로 반환한다', () => {
    const records: ChatEvidenceRecord[] = [
      {
        id: 'ko/blog/why-i-built-lee-spec-kit/intro',
        locale: 'ko',
        slug: 'why-i-built-lee-spec-kit',
        title: 'AI 시대의 개발 생산성은 코드보다 구조에 달려 있다',
        url: '/ko/blog/why-i-built-lee-spec-kit',
        excerpt: 'lee-spec-kit을 만든 이유를 설명합니다.',
        content:
          'lee-spec-kit은 AI 보조 개발을 위한 문서 구조와 워크플로우를 정리하기 위해 만든 CLI입니다.',
        sectionTitle: null,
        tags: ['lee-spec-kit'],
        searchTerms: [],
        sourceCategory: 'blog',
      },
      {
        id: 'ko/blog/leemage-case-study/intro',
        locale: 'ko',
        slug: 'leemage-case-study',
        title: '비용 문제에서 시작해 파일 관리 플랫폼이 된 Leemage 제작기',
        url: '/ko/blog/leemage-case-study',
        excerpt: 'Leemage 제작기',
        content: 'Leemage는 비용 절감을 위한 파일 관리 플랫폼입니다.',
        sectionTitle: null,
        tags: ['leemage'],
        searchTerms: [],
        sourceCategory: 'blog',
      },
    ]

    const result = selectChatSearchMatches({
      question: '이 도구를 짧게 소개해줘',
      locale: 'ko',
      records,
      currentPostSlug: 'why-i-built-lee-spec-kit',
    })

    expect(result.grounded).toBe(true)
    expect(result.matches[0]?.slug).toBe('why-i-built-lee-spec-kit')
  })

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

  it('프로젝트 이름 뒤에 짧은 질문 표현이 붙어도 해당 프로젝트를 찾는다', () => {
    const records: ChatEvidenceRecord[] = [
      {
        id: 'ko/project/leesfield',
        locale: 'ko',
        slug: 'leesfield',
        title: 'Leesfield',
        url: '/ko/projects/leesfield',
        excerpt: 'AI 이미지/비디오 생성 플랫폼',
        content: 'AI 이미지 생성 플랫폼입니다.',
        sectionTitle: null,
        tags: ['project'],
        searchTerms: ['leesfield', 'ai 이미지 생성'],
        sourceCategory: 'project',
      },
      {
        id: 'ko/project/blog',
        locale: 'ko',
        slug: 'blog',
        title: '블로그',
        url: '/ko/projects/blog',
        excerpt: 'Next.js 기반 블로그',
        content: 'LEESFIELD API KEY 필요',
        sectionTitle: null,
        tags: ['project'],
        searchTerms: ['블로그 프로젝트 뭐야', '블로그는 뭐야'],
        sourceCategory: 'project',
      },
    ]

    const result = selectChatSearchMatches({
      question: 'leesfield 알아',
      locale: 'ko',
      records,
    })

    expect(result.grounded).toBe(true)
    expect(result.matches[0]?.slug).toBe('leesfield')
  })

  it('프로젝트 이름 질의에서 질문형 표현 때문에 다른 프로젝트가 우선되지 않는다', () => {
    const records: ChatEvidenceRecord[] = [
      {
        id: 'ko/project/leesfield',
        locale: 'ko',
        slug: 'leesfield',
        title: 'Leesfield',
        url: '/ko/projects/leesfield',
        excerpt: 'AI 이미지/비디오 생성 플랫폼',
        content: 'AI 이미지 생성 플랫폼입니다.',
        sectionTitle: null,
        tags: ['project'],
        searchTerms: ['leesfield', 'ai 이미지 생성'],
        sourceCategory: 'project',
      },
      {
        id: 'ko/project/blog',
        locale: 'ko',
        slug: 'blog',
        title: '블로그',
        url: '/ko/projects/blog',
        excerpt: 'Next.js 기반 블로그',
        content: 'LEESFIELD API KEY 필요',
        sectionTitle: null,
        tags: ['project'],
        searchTerms: ['블로그 프로젝트 뭐야', '블로그는 뭐야'],
        sourceCategory: 'project',
      },
    ]

    const result = selectChatSearchMatches({
      question: 'leesfield가 뭐야',
      locale: 'ko',
      records,
    })

    expect(result.grounded).toBe(true)
    expect(result.matches[0]?.slug).toBe('leesfield')
  })
})
