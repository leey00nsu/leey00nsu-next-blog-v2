import { describe, expect, it } from 'vitest'
import {
  buildPgvectorLiteral,
  parsePgvectorText,
} from '@/features/chat/lib/pgvector'

describe('buildPgvectorLiteral', () => {
  it('숫자 배열을 pgvector 리터럴로 만든다', () => {
    expect(buildPgvectorLiteral([0.1, 0.2, 0.3])).toBe('[0.1,0.2,0.3]')
  })
})

describe('parsePgvectorText', () => {
  it('대괄호 형식 vector 텍스트를 숫자 배열로 바꾼다', () => {
    expect(parsePgvectorText('[0.1,0.2,0.3]')).toEqual([0.1, 0.2, 0.3])
  })

  it('중괄호 형식 vector 텍스트도 숫자 배열로 바꾼다', () => {
    expect(parsePgvectorText('{0.4,0.5}')).toEqual([0.4, 0.5])
  })
})
