import { describe, expect, it } from 'vitest'
import { buildPostSearchRecords } from './post-search-records'
import type { Post } from '@/entities/post/model/types'

function createMockPost(content: string): Post {
  return {
    slug: 'react-query-guide',
    title: 'React Query 가이드',
    description: '서버 상태 관리 정리',
    date: new Date('2024-01-01T00:00:00.000Z'),
    writer: 'leey00nsu',
    tags: ['react-query', 'tanstack-query'],
    section: 'blog',
    series: null,
    thumbnail: null,
    draft: false,
    content,
    width: 0,
    height: 0,
    isAnimated: false,
  }
}

describe('buildPostSearchRecords', () => {
  it('서론과 각 섹션을 분리해 anchor URL을 생성한다', () => {
    const post = createMockPost(`
도입부 문단입니다.

## React Query가 필요한 이유
서버 상태를 캐시하고 동기화합니다.

### staleTime 설정
불필요한 재요청을 줄입니다.
`)

    const result = buildPostSearchRecords({
      post,
      locale: 'ko',
    })

    expect(result).toHaveLength(3)
    expect(result[0].url).toBe('/ko/blog/react-query-guide')
    expect(result[0].sectionTitle).toBeNull()
    expect(result[1].url).toBe('/ko/blog/react-query-guide#react-query가-필요한-이유')
    expect(result[1].sectionTitle).toBe('React Query가 필요한 이유')
    expect(result[2].url).toBe('/ko/blog/react-query-guide#staletime-설정')
    expect(result[2].sectionTitle).toBe('staleTime 설정')
  })

  it('코드 펜스 안의 가짜 헤딩은 섹션으로 분리하지 않는다', () => {
    const post = createMockPost(`
\`\`\`md
## 코드 블록 안의 제목
\`\`\`

## 실제 섹션
실제 본문
`)

    const result = buildPostSearchRecords({
      post,
      locale: 'ko',
    })

    expect(result).toHaveLength(1)
    expect(result[0].sectionTitle).toBe('실제 섹션')
  })
})
