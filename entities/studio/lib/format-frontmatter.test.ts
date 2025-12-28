import { describe, it, expect } from 'vitest'
import { formatFrontmatter } from './format-frontmatter'
import type { Frontmatter } from '@/entities/studio/model/frontmatter-schema'

describe('formatFrontmatter', () => {
  it('기본 frontmatter를 올바르게 포맷팅한다', () => {
    const frontmatter: Frontmatter = {
      slug: 'test-post',
      title: '테스트 포스트',
      tags: ['react', 'typescript'],
      description: '테스트 설명입니다.',
      date: '2024-01-15',
      section: 'blog',
      series: null,
      thumbnail: null,
      draft: false,
      writer: 'leey00nsu',
    }

    const result = formatFrontmatter(frontmatter)

    expect(result).toContain('---')
    expect(result).toContain('slug: test-post')
    expect(result).toContain('title: 테스트 포스트')
    expect(result).toContain('tags:')
    expect(result).toContain('  - react')
    expect(result).toContain('  - typescript')
    expect(result).toContain('description: 테스트 설명입니다.')
    expect(result).toContain('date: 2024-01-15')
    expect(result).toContain('section: blog')
    expect(result).toContain('draft: false')
    expect(result).toContain('writer: leey00nsu')
  })

  it('series와 thumbnail이 있는 경우 포함한다', () => {
    const frontmatter: Frontmatter = {
      slug: 'series-post',
      title: '시리즈 포스트',
      tags: ['series'],
      description: '시리즈 설명',
      date: '2024-02-20',
      section: 'tutorial',
      series: 'React 시리즈',
      thumbnail: '/public/posts/series-post/thumbnail.png',
      draft: true,
      writer: 'author',
    }

    const result = formatFrontmatter(frontmatter)

    expect(result).toContain('series: React 시리즈')
    expect(result).toContain('thumbnail: /public/posts/series-post/thumbnail.png')
    expect(result).toContain('draft: true')
  })

  it('빈 태그 배열을 처리한다', () => {
    const frontmatter: Frontmatter = {
      slug: 'no-tags',
      title: '태그 없는 포스트',
      tags: [],
      description: '설명',
      date: '2024-03-01',
      section: 'blog',
      series: null,
      thumbnail: null,
      draft: false,
      writer: 'writer',
    }

    const result = formatFrontmatter(frontmatter)

    expect(result).toContain('tags:')
    expect(result).not.toContain('  - ')
  })

  it('frontmatter 블록이 ---로 시작하고 끝난다', () => {
    const frontmatter: Frontmatter = {
      slug: 'test',
      title: 'Test',
      tags: [],
      description: 'desc',
      date: '2024-01-01',
      section: 'blog',
      series: null,
      thumbnail: null,
      draft: false,
      writer: 'writer',
    }

    const result = formatFrontmatter(frontmatter)
    const lines = result.split('\n')

    expect(lines[0]).toBe('---')
    expect(lines[lines.length - 2]).toBe('---')
  })
})
