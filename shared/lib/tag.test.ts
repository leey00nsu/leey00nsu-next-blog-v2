import { describe, it, expect } from 'vitest'
import {
  normalizeTag,
  hasTag,
  addTag,
  removeTag,
  availableSuggestions,
} from './tag'

describe('normalizeTag', () => {
  it('앞뒤 공백을 제거한다', () => {
    expect(normalizeTag('  react  ')).toBe('react')
    expect(normalizeTag('typescript')).toBe('typescript')
  })
})

describe('hasTag', () => {
  it('태그가 목록에 있으면 true를 반환한다', () => {
    expect(hasTag(['react', 'typescript'], 'react')).toBe(true)
  })

  it('태그가 목록에 없으면 false를 반환한다', () => {
    expect(hasTag(['react', 'typescript'], 'vue')).toBe(false)
  })

  it('대소문자를 구분하지 않는다', () => {
    expect(hasTag(['React', 'TypeScript'], 'react')).toBe(true)
    expect(hasTag(['react'], 'REACT')).toBe(true)
  })

  it('빈 목록에서는 false를 반환한다', () => {
    expect(hasTag([], 'react')).toBe(false)
  })
})

describe('addTag', () => {
  it('새 태그를 목록에 추가한다', () => {
    expect(addTag(['react'], 'typescript')).toEqual(['react', 'typescript'])
  })

  it('이미 존재하는 태그는 추가하지 않는다', () => {
    expect(addTag(['react', 'typescript'], 'react')).toEqual([
      'react',
      'typescript',
    ])
  })

  it('대소문자가 다른 중복 태그도 추가하지 않는다', () => {
    expect(addTag(['react'], 'REACT')).toEqual(['react'])
  })

  it('빈 태그는 추가하지 않는다', () => {
    expect(addTag(['react'], '')).toEqual(['react'])
    expect(addTag(['react'], '   ')).toEqual(['react'])
  })

  it('빈 목록에 태그를 추가한다', () => {
    expect(addTag([], 'react')).toEqual(['react'])
  })
})

describe('removeTag', () => {
  it('태그를 목록에서 제거한다', () => {
    expect(removeTag(['react', 'typescript'], 'react')).toEqual(['typescript'])
  })

  it('존재하지 않는 태그 제거 시 원본을 반환한다', () => {
    expect(removeTag(['react'], 'vue')).toEqual(['react'])
  })

  it('빈 목록에서 제거 시 빈 배열을 반환한다', () => {
    expect(removeTag([], 'react')).toEqual([])
  })
})

describe('availableSuggestions', () => {
  it('현재 태그를 제외한 제안을 반환한다', () => {
    const current = ['react']
    const suggestions = ['react', 'typescript', 'vue']
    expect(availableSuggestions(current, suggestions)).toEqual([
      'typescript',
      'vue',
    ])
  })

  it('대소문자를 구분하지 않고 필터링한다', () => {
    const current = ['React']
    const suggestions = ['react', 'typescript']
    expect(availableSuggestions(current, suggestions)).toEqual(['typescript'])
  })

  it('limit 개수만큼만 반환한다', () => {
    const current: string[] = []
    const suggestions = ['a', 'b', 'c', 'd', 'e']
    expect(availableSuggestions(current, suggestions, 3)).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  it('빈 제안 목록에서는 빈 배열을 반환한다', () => {
    expect(availableSuggestions(['react'], [])).toEqual([])
    expect(availableSuggestions(['react'])).toEqual([])
  })

  it('빈 문자열 제안을 필터링한다', () => {
    const suggestions = ['react', '', 'typescript']
    expect(availableSuggestions([], suggestions)).toEqual([
      'react',
      'typescript',
    ])
  })
})
