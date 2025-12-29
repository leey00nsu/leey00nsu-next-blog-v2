/**
 * 슬래시 커맨드 필터링 Property 테스트
 *
 * **Property 4: 슬래시 커맨드 필터링**
 * *For any* 검색 쿼리 문자열, 슬래시 커맨드 메뉴는 쿼리를 포함하는 항목만 반환해야 한다.
 *
 * **Validates: Requirements 2.3**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  filterSlashCommandItems,
  SLASH_COMMAND_ITEMS,
  type SlashCommandItem,
} from './slash-command'

describe('슬래시 커맨드 필터링 Property 테스트', () => {
  /**
   * Feature: tiptap-editor, Property 4: 슬래시 커맨드 필터링
   * Validates: Requirements 2.3
   */
  it('Property 4: 빈 쿼리는 모든 항목을 반환한다', () => {
    const result = filterSlashCommandItems(SLASH_COMMAND_ITEMS, '')
    expect(result).toEqual(SLASH_COMMAND_ITEMS)
  })

  it('Property 4: 공백만 있는 쿼리는 모든 항목을 반환한다', () => {
    const whitespaceQueries = ['', ' ', '  ', '   ', '    ']

    for (const whitespace of whitespaceQueries) {
      const result = filterSlashCommandItems(SLASH_COMMAND_ITEMS, whitespace)
      expect(result).toEqual(SLASH_COMMAND_ITEMS)
    }
  })

  it('Property 4: 필터링된 결과의 모든 항목은 쿼리와 매칭되어야 한다', () => {
    // 실제 항목에서 키워드/제목/설명의 일부를 추출하여 테스트
    const validQueries = SLASH_COMMAND_ITEMS.flatMap((item) => [
      item.title.slice(0, 2),
      ...item.keywords.map((k) => k.slice(0, 3)),
    ]).filter((q) => q.length > 0)

    fc.assert(
      fc.property(fc.constantFrom(...validQueries), (query) => {
        const result = filterSlashCommandItems(SLASH_COMMAND_ITEMS, query)

        // 결과의 모든 항목은 쿼리와 매칭되어야 함
        for (const item of result) {
          const matches =
            item.title.toLowerCase().includes(query.toLowerCase()) ||
            item.description.toLowerCase().includes(query.toLowerCase()) ||
            item.keywords.some((k) =>
              k.toLowerCase().includes(query.toLowerCase()),
            )

          expect(matches).toBe(true)
        }
      }),
      { numRuns: 100 },
    )
  })

  it('Property 4: 매칭되지 않는 쿼리는 빈 배열을 반환한다', () => {
    // 절대 매칭되지 않을 쿼리들
    const nonMatchingQueries = [
      'zzzzzzz',
      'xyzabc123',
      '!@#$%^',
      'qwertyuiop',
    ]

    for (const query of nonMatchingQueries) {
      const result = filterSlashCommandItems(SLASH_COMMAND_ITEMS, query)
      expect(result).toEqual([])
    }
  })

  it('Property 4: 대소문자 구분 없이 필터링된다', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('heading', 'HEADING', 'Heading', 'HeAdInG'),
        (query) => {
          const result = filterSlashCommandItems(SLASH_COMMAND_ITEMS, query)

          // heading 키워드를 가진 항목들이 반환되어야 함
          expect(result.length).toBeGreaterThan(0)

          for (const item of result) {
            const matches =
              item.title.toLowerCase().includes(query.toLowerCase()) ||
              item.description.toLowerCase().includes(query.toLowerCase()) ||
              item.keywords.some((k) =>
                k.toLowerCase().includes(query.toLowerCase()),
              )

            expect(matches).toBe(true)
          }
        },
      ),
      { numRuns: 10 },
    )
  })

  it('Property 4: 필터링 결과는 원본 항목의 부분집합이다', () => {
    const queryArbitrary = fc
      .stringMatching(/^[a-zA-Z가-힣0-9]+$/)
      .filter((s) => s.length > 0 && s.length <= 10)

    fc.assert(
      fc.property(queryArbitrary, (query) => {
        const result = filterSlashCommandItems(SLASH_COMMAND_ITEMS, query)

        // 결과의 모든 항목은 원본에 존재해야 함
        for (const item of result) {
          expect(SLASH_COMMAND_ITEMS).toContain(item)
        }

        // 결과 길이는 원본 이하여야 함
        expect(result.length).toBeLessThanOrEqual(SLASH_COMMAND_ITEMS.length)
      }),
      { numRuns: 100 },
    )
  })

  it('특정 키워드로 필터링하면 해당 항목이 반환된다', () => {
    // 제목 1 검색
    const heading1Result = filterSlashCommandItems(SLASH_COMMAND_ITEMS, '제목 1')
    expect(heading1Result.some((item) => item.title === '제목 1')).toBe(true)

    // 코드 검색
    const codeResult = filterSlashCommandItems(SLASH_COMMAND_ITEMS, 'code')
    expect(codeResult.some((item) => item.title === '코드 블록')).toBe(true)

    // 이미지 검색
    const imageResult = filterSlashCommandItems(SLASH_COMMAND_ITEMS, 'image')
    expect(imageResult.some((item) => item.title === '이미지')).toBe(true)
  })
})
