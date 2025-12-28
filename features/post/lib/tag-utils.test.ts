import { describe, it, expect } from 'vitest'
import {
  getTagCounts,
  parseSelectedTags,
  makeToggleHref,
  filterPostsByTags,
} from './tag-utils'
import type { Post } from '@/entities/post/model/types'

const createMockPost = (tags: string[]): Post => ({
  slug: `post-${Math.random().toString(36).slice(2)}`,
  title: 'Test Post',
  description: 'Test description',
  date: new Date(),
  writer: 'author',
  tags,
  section: 'blog',
  series: null,
  thumbnail: null,
  draft: false,
  content: '',
  width: 160,
  height: 160,
})

describe('getTagCounts', () => {
  it('각 태그의 개수를 계산한다', () => {
    const posts = [
      createMockPost(['react', 'typescript']),
      createMockPost(['react', 'nextjs']),
      createMockPost(['typescript']),
    ]

    const counts = getTagCounts(posts)

    expect(counts).toEqual({
      react: 2,
      typescript: 2,
      nextjs: 1,
    })
  })

  it('빈 포스트 배열에서 빈 객체를 반환한다', () => {
    expect(getTagCounts([])).toEqual({})
  })

  it('태그가 없는 포스트를 처리한다', () => {
    const posts = [createMockPost([]), createMockPost(['react'])]

    const counts = getTagCounts(posts)

    expect(counts).toEqual({ react: 1 })
  })
})

describe('parseSelectedTags', () => {
  it('단일 태그 문자열을 배열로 반환한다', () => {
    expect(parseSelectedTags({ tag: 'react' })).toEqual(['react'])
  })

  it('태그 배열을 그대로 반환한다', () => {
    expect(parseSelectedTags({ tag: ['react', 'typescript'] })).toEqual([
      'react',
      'typescript',
    ])
  })

  it('params가 없으면 빈 배열을 반환한다', () => {
    expect(parseSelectedTags()).toEqual([])
  })

  it('tag 키가 없으면 빈 배열을 반환한다', () => {
    expect(parseSelectedTags({})).toEqual([])
    expect(parseSelectedTags({ other: 'value' })).toEqual([])
  })

  it('배열에서 문자열이 아닌 값을 필터링한다', () => {
    const params = { tag: ['react', undefined, 'typescript'] as string[] }
    expect(parseSelectedTags(params)).toEqual(['react', 'typescript'])
  })
})

describe('makeToggleHref', () => {
  it('선택되지 않은 태그를 추가한다', () => {
    const toggleHref = makeToggleHref('/blog', [])
    expect(toggleHref('react')).toBe('/blog?tag=react')
  })

  it('이미 선택된 태그를 제거한다', () => {
    const toggleHref = makeToggleHref('/blog', ['react'])
    expect(toggleHref('react')).toBe('/blog')
  })

  it('여러 태그가 선택된 경우 하나를 토글한다', () => {
    const toggleHref = makeToggleHref('/blog', ['react', 'typescript'])

    // react 제거
    const result = toggleHref('react')
    expect(result).toBe('/blog?tag=typescript')
  })

  it('새 태그를 기존 선택에 추가한다', () => {
    const toggleHref = makeToggleHref('/blog', ['react'])
    const result = toggleHref('typescript')

    expect(result).toContain('tag=react')
    expect(result).toContain('tag=typescript')
  })

  it('모든 태그가 제거되면 basePath만 반환한다', () => {
    const toggleHref = makeToggleHref('/blog', ['react'])
    expect(toggleHref('react')).toBe('/blog')
  })
})

describe('filterPostsByTags', () => {
  const posts = [
    createMockPost(['react', 'typescript']),
    createMockPost(['react', 'nextjs']),
    createMockPost(['vue']),
  ]

  it('태그가 없으면 모든 포스트를 반환한다', () => {
    expect(filterPostsByTags(posts, [])).toEqual(posts)
  })

  it('단일 태그로 필터링한다', () => {
    const filtered = filterPostsByTags(posts, ['react'])
    expect(filtered).toHaveLength(2)
    expect(filtered.every((p) => p.tags.includes('react'))).toBe(true)
  })

  it('여러 태그 중 하나라도 포함하면 반환한다 (OR 조건)', () => {
    const filtered = filterPostsByTags(posts, ['typescript', 'vue'])
    expect(filtered).toHaveLength(2)
  })

  it('일치하는 포스트가 없으면 빈 배열을 반환한다', () => {
    const filtered = filterPostsByTags(posts, ['angular'])
    expect(filtered).toEqual([])
  })
})
