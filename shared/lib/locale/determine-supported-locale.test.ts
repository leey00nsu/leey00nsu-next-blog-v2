import { describe, it, expect } from 'vitest'
import { determineSupportedLocale } from './determine-supported-locale'

describe('determineSupportedLocale', () => {
  it('첫 번째 유효한 로케일을 반환한다', () => {
    expect(determineSupportedLocale(['en', 'ko'])).toBe('en')
    expect(determineSupportedLocale(['ko', 'en'])).toBe('ko')
  })

  it('대소문자를 구분하지 않는다', () => {
    expect(determineSupportedLocale(['EN'])).toBe('en')
    expect(determineSupportedLocale(['KO'])).toBe('ko')
    expect(determineSupportedLocale(['Ko'])).toBe('ko')
  })

  it('null/undefined 값을 건너뛴다', () => {
    expect(determineSupportedLocale([null, 'en'])).toBe('en')
    expect(determineSupportedLocale([undefined, 'ko'])).toBe('ko')
    expect(determineSupportedLocale([null, undefined, 'en'])).toBe('en')
  })

  it('지원하지 않는 로케일을 건너뛴다', () => {
    expect(determineSupportedLocale(['fr', 'en'])).toBe('en')
    expect(determineSupportedLocale(['de', 'ja', 'ko'])).toBe('ko')
  })

  it('유효한 로케일이 없으면 기본값(ko)을 반환한다', () => {
    expect(determineSupportedLocale([])).toBe('ko')
    expect(determineSupportedLocale([null])).toBe('ko')
    expect(determineSupportedLocale([undefined])).toBe('ko')
    expect(determineSupportedLocale(['fr', 'de'])).toBe('ko')
  })

  it('빈 문자열을 건너뛴다', () => {
    expect(determineSupportedLocale(['', 'en'])).toBe('en')
  })
})
