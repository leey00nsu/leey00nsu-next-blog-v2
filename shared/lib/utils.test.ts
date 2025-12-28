import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('단일 클래스를 반환한다', () => {
    expect(cn('text-red-500')).toBe('text-red-500')
  })

  it('여러 클래스를 병합한다', () => {
    expect(cn('text-red-500', 'bg-blue-500')).toBe('text-red-500 bg-blue-500')
  })

  it('조건부 클래스를 처리한다', () => {
    expect(cn('base', true && 'active')).toBe('base active')
    expect(cn('base', false && 'active')).toBe('base')
  })

  it('undefined와 null을 무시한다', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end')
  })

  it('빈 문자열을 무시한다', () => {
    expect(cn('base', '', 'end')).toBe('base end')
  })

  it('Tailwind 클래스 충돌을 해결한다', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('객체 형태의 조건부 클래스를 처리한다', () => {
    expect(cn({ 'text-red-500': true, 'bg-blue-500': false })).toBe(
      'text-red-500'
    )
  })

  it('배열 형태의 클래스를 처리한다', () => {
    expect(cn(['text-red-500', 'bg-blue-500'])).toBe('text-red-500 bg-blue-500')
  })

  it('복잡한 조합을 처리한다', () => {
    const isActive = true
    const isDisabled = false
    expect(
      cn(
        'base-class',
        isActive && 'active',
        isDisabled && 'disabled',
        { 'hover:bg-gray-100': true },
        ['flex', 'items-center']
      )
    ).toBe('base-class active hover:bg-gray-100 flex items-center')
  })

  it('인자가 없으면 빈 문자열을 반환한다', () => {
    expect(cn()).toBe('')
  })
})
