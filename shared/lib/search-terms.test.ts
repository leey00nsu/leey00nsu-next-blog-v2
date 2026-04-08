import { describe, expect, it } from 'vitest'
import { collectSearchTerms } from '@/shared/lib/search-terms'

describe('collectSearchTerms', () => {
  it('기술 이름과 태그에서 영문 검색어 확장어를 함께 만든다', () => {
    const result = collectSearchTerms({
      texts: [
        'React Query로 서버 상태를 관리합니다.',
        'Next.js와 TypeScript를 사용합니다.',
      ],
      phrases: ['react-query', 'Next.js', '기술 스택'],
    })

    expect(result).toEqual(
      expect.arrayContaining([
        'react-query',
        'react query',
        'tanstack query',
        'next.js',
        'nextjs',
        'typescript',
        'tech stack',
        '기술 스택',
      ]),
    )
  })

  it('중복과 불용어를 제거한다', () => {
    const result = collectSearchTerms({
      texts: ['This is the project for the project'],
      phrases: ['project', 'project'],
    })

    expect(result.filter((term) => term === 'project')).toHaveLength(1)
    expect(result).not.toContain('the')
  })
})
