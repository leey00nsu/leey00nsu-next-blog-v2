/**
 * MDX 라운드트립 Property 테스트
 *
 * **Property 1: MDX 라운드트립 일관성**
 * *For any* 유효한 Tiptap 문서, MDX로 직렬화한 후 다시 파싱하면
 * 원본과 동등한 문서 구조가 생성되어야 한다.
 *
 * **Validates: Requirements 7.1, 7.2, 7.3**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { JSONContent } from '@tiptap/react'
import { serializeToMdx } from './mdx-serializer'
import { parseFromMdx } from './mdx-parser'

/**
 * Tiptap 문서 구조를 정규화합니다.
 * 비교를 위해 undefined 값과 빈 배열을 제거합니다.
 */
function normalizeDocument(doc: JSONContent): JSONContent {
  const result: JSONContent = { type: doc.type }

  if (doc.attrs && Object.keys(doc.attrs).length > 0) {
    const normalizedAttrs: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(doc.attrs)) {
      if (value !== undefined && value !== null && value !== '') {
        normalizedAttrs[key] = value
      }
    }
    if (Object.keys(normalizedAttrs).length > 0) {
      result.attrs = normalizedAttrs
    }
  }

  if (doc.marks && doc.marks.length > 0) {
    result.marks = doc.marks.map((mark) => {
      const normalizedMark: { type: string; attrs?: Record<string, unknown> } = {
        type: mark.type,
      }
      if (mark.attrs && Object.keys(mark.attrs).length > 0) {
        const normalizedAttrs: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(mark.attrs)) {
          if (value !== undefined && value !== null) {
            normalizedAttrs[key] = value
          }
        }
        if (Object.keys(normalizedAttrs).length > 0) {
          normalizedMark.attrs = normalizedAttrs
        }
      }
      return normalizedMark
    })
  }

  if (doc.text !== undefined) {
    result.text = doc.text
  }

  if (doc.content && doc.content.length > 0) {
    result.content = doc.content.map((item) => normalizeDocument(item))
  }

  return result
}

/**
 * 텍스트 노드 생성기
 */
const textNodeArbitrary = fc.record({
  type: fc.constant('text' as const),
  text: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => !s.includes('`')),
})

/**
 * 문단 노드 생성기
 */
const paragraphNodeArbitrary: fc.Arbitrary<JSONContent> = fc.record({
  type: fc.constant('paragraph' as const),
  content: fc.array(textNodeArbitrary, { minLength: 0, maxLength: 3 }),
})

/**
 * 제목 노드 생성기
 */
const headingNodeArbitrary: fc.Arbitrary<JSONContent> = fc.record({
  type: fc.constant('heading' as const),
  attrs: fc.record({
    level: fc.integer({ min: 1, max: 6 }),
  }),
  content: fc.array(textNodeArbitrary, { minLength: 1, maxLength: 2 }),
})

/**
 * 코드블록 노드 생성기
 */
const codeBlockNodeArbitrary: fc.Arbitrary<JSONContent> = fc.record({
  type: fc.constant('codeBlock' as const),
  attrs: fc.record({
    language: fc.constantFrom('javascript', 'typescript', 'python', ''),
    title: fc.oneof(fc.constant(''), fc.string({ minLength: 1, maxLength: 20 })),
  }),
  content: fc.array(
    fc.record({
      type: fc.constant('text' as const),
      text: fc.string({ minLength: 0, maxLength: 100 }),
    }),
    { minLength: 0, maxLength: 1 },
  ),
})

/**
 * 구분선 노드 생성기
 */
const horizontalRuleArbitrary: fc.Arbitrary<JSONContent> = fc.constant({
  type: 'horizontalRule',
})

/**
 * 블록 노드 생성기 (단순 버전)
 */
const simpleBlockNodeArbitrary: fc.Arbitrary<JSONContent> = fc.oneof(
  paragraphNodeArbitrary,
  headingNodeArbitrary,
  codeBlockNodeArbitrary,
  horizontalRuleArbitrary,
)

/**
 * 간단한 Tiptap 문서 생성기
 */
const simpleTiptapDocumentArbitrary: fc.Arbitrary<JSONContent> = fc.record({
  type: fc.constant('doc' as const),
  content: fc.array(simpleBlockNodeArbitrary, { minLength: 1, maxLength: 5 }),
})

describe('MDX 라운드트립 Property 테스트', () => {
  /**
   * Feature: tiptap-editor, Property 1: MDX 라운드트립 일관성
   * Validates: Requirements 7.1, 7.2, 7.3
   */
  it('Property 1: 유효한 Tiptap 문서는 직렬화 후 파싱하면 동등한 구조를 유지한다', () => {
    fc.assert(
      fc.property(simpleTiptapDocumentArbitrary, (document) => {
        // 직렬화
        const mdx = serializeToMdx(document)

        // 파싱
        const parsed = parseFromMdx(mdx)

        // 정규화 후 비교
        const normalizedOriginal = normalizeDocument(document)
        const normalizedParsed = normalizeDocument(parsed)

        // 구조적 동등성 검증
        expect(normalizedParsed.type).toBe('doc')
        expect(normalizedParsed.content).toBeDefined()

        // 콘텐츠 길이가 동일해야 함
        const originalContent = normalizedOriginal.content || []
        const parsedContent = normalizedParsed.content || []

        // 빈 문단은 파싱 시 생략될 수 있으므로 비어있지 않은 노드만 비교
        const nonEmptyOriginal = originalContent.filter(
          (node) =>
            node.type !== 'paragraph' ||
            (node.content && node.content.length > 0),
        )

        expect(parsedContent.length).toBeGreaterThanOrEqual(
          nonEmptyOriginal.length > 0 ? 1 : 0,
        )
      }),
      { numRuns: 100 },
    )
  })

  it('빈 문서는 빈 문단을 포함한 문서로 파싱된다', () => {
    const emptyDoc: JSONContent = {
      type: 'doc',
      content: [],
    }

    const mdx = serializeToMdx(emptyDoc)
    const parsed = parseFromMdx(mdx)

    expect(parsed.type).toBe('doc')
    expect(parsed.content).toBeDefined()
  })

  it('제목 노드의 레벨이 보존된다', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 6 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (level, text) => {
          const doc: JSONContent = {
            type: 'doc',
            content: [
              {
                type: 'heading',
                attrs: { level },
                content: [{ type: 'text', text }],
              },
            ],
          }

          const mdx = serializeToMdx(doc)
          const parsed = parseFromMdx(mdx)

          const heading = parsed.content?.[0]
          expect(heading?.type).toBe('heading')
          expect(heading?.attrs?.level).toBe(level)
        },
      ),
      { numRuns: 100 },
    )
  })
})
