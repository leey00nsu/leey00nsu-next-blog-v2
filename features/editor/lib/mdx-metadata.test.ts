/**
 * MDX 메타데이터 보존 Property 테스트
 *
 * **Property 2: 코드블록 메타데이터 보존**
 * *For any* 코드블록 노드, MDX 직렬화 시 언어(language)와 제목(title) 속성이
 * 메타 문자열로 올바르게 인코딩되어야 한다.
 *
 * **Property 3: 이미지 속성 보존**
 * *For any* 이미지 노드, MDX 직렬화 시 src, alt, width, height 속성이
 * 모두 보존되어야 한다.
 *
 * **Validates: Requirements 7.4, 7.5**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { JSONContent } from '@tiptap/react'
import { serializeToMdx } from './mdx-serializer'
import { parseFromMdx } from './mdx-parser'

describe('코드블록 메타데이터 보존 Property 테스트', () => {
  /**
   * Feature: tiptap-editor, Property 2: 코드블록 메타데이터 보존
   * Validates: Requirements 7.4
   */
  it('Property 2: 코드블록의 언어와 제목이 직렬화/파싱 후 보존된다', () => {
    const languageArbitrary = fc.constantFrom(
      'javascript',
      'typescript',
      'python',
      'rust',
      'go',
      'java',
      '',
    )

    // 제목은 빈 문자열이거나 알파벳/숫자로 구성된 유효한 문자열 (줄바꿈, 공백 제외)
    const titleArbitrary = fc.oneof(
      fc.constant(''),
      fc
        .stringMatching(/^[a-zA-Z0-9가-힣]+$/)
        .filter((s) => s.length > 0 && s.length <= 30),
    )

    const codeArbitrary = fc
      .string({ minLength: 0, maxLength: 200 })
      .filter((s) => !s.includes('```'))

    fc.assert(
      fc.property(
        languageArbitrary,
        titleArbitrary,
        codeArbitrary,
        (language, title, code) => {
          const doc: JSONContent = {
            type: 'doc',
            content: [
              {
                type: 'codeBlock',
                attrs: { language, title },
                content: code ? [{ type: 'text', text: code }] : undefined,
              },
            ],
          }

          // 직렬화
          const mdx = serializeToMdx(doc)

          // 언어가 있으면 MDX에 포함되어야 함
          if (language) {
            expect(mdx).toContain(`\`\`\`${language}`)
          }

          // 제목이 있으면 MDX에 포함되어야 함
          if (title) {
            expect(mdx).toContain(`title="${title}"`)
          }

          // 파싱
          const parsed = parseFromMdx(mdx)
          const codeBlock = parsed.content?.[0]

          expect(codeBlock?.type).toBe('codeBlock')
          expect(codeBlock?.attrs?.language).toBe(language)
          expect(codeBlock?.attrs?.title).toBe(title)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('코드블록 내용이 보존된다', () => {
    const codeArbitrary = fc
      .string({ minLength: 1, maxLength: 100 })
      .filter((s) => !s.includes('```'))

    fc.assert(
      fc.property(codeArbitrary, (code) => {
        const doc: JSONContent = {
          type: 'doc',
          content: [
            {
              type: 'codeBlock',
              attrs: { language: 'javascript', title: '' },
              content: [{ type: 'text', text: code }],
            },
          ],
        }

        const mdx = serializeToMdx(doc)
        const parsed = parseFromMdx(mdx)
        const codeBlock = parsed.content?.[0]

        expect(codeBlock?.content?.[0]?.text).toBe(code)
      }),
      { numRuns: 100 },
    )
  })
})

describe('이미지 속성 보존 Property 테스트', () => {
  /**
   * Feature: tiptap-editor, Property 3: 이미지 속성 보존
   * Validates: Requirements 7.5
   */
  it('Property 3: 이미지의 src, alt 속성이 직렬화/파싱 후 보존된다', () => {
    // 유효한 파일명만 생성 (알파벳, 숫자, 하이픈, 언더스코어)
    const filenameArbitrary = fc
      .stringMatching(/^[a-zA-Z0-9_-]+$/)
      .filter((s) => s.length > 0 && s.length <= 30)
      .map((s) => `/images/${s}.png`)

    const altArbitrary = fc
      .stringMatching(/^[a-zA-Z0-9가-힣]*$/)
      .filter((s) => s.length <= 30)

    fc.assert(
      fc.property(filenameArbitrary, altArbitrary, (src, alt) => {
        const doc: JSONContent = {
          type: 'doc',
          content: [
            {
              type: 'image',
              attrs: { src, alt, title: '' },
            },
          ],
        }

        // 직렬화
        const mdx = serializeToMdx(doc)

        // 기본 마크다운 이미지 문법 확인
        expect(mdx).toContain(`![${alt}](${src}`)

        // 파싱
        const parsed = parseFromMdx(mdx)
        const image = parsed.content?.[0]

        expect(image?.type).toBe('image')
        expect(image?.attrs?.src).toBe(src)
        expect(image?.attrs?.alt).toBe(alt)
      }),
      { numRuns: 100 },
    )
  })

  it('이미지의 width, height 속성이 HTML 태그로 직렬화되고 파싱 후 보존된다', () => {
    const srcArbitrary = fc.constant('/images/test.png')
    const altArbitrary = fc.constant('테스트 이미지')
    const dimensionArbitrary = fc.integer({ min: 100, max: 1920 })

    fc.assert(
      fc.property(
        srcArbitrary,
        altArbitrary,
        dimensionArbitrary,
        dimensionArbitrary,
        (src, alt, width, height) => {
          const doc: JSONContent = {
            type: 'doc',
            content: [
              {
                type: 'image',
                attrs: { src, alt, title: '', width, height },
              },
            ],
          }

          // 직렬화
          const mdx = serializeToMdx(doc)

          // HTML img 태그로 직렬화되어야 함
          expect(mdx).toContain('<img')
          expect(mdx).toContain(`src="${src}"`)
          expect(mdx).toContain(`alt="${alt}"`)
          expect(mdx).toContain(`width="${width}"`)
          expect(mdx).toContain(`height="${height}"`)

          // 파싱
          const parsed = parseFromMdx(mdx)
          const image = parsed.content?.[0]

          expect(image?.type).toBe('image')
          expect(image?.attrs?.src).toBe(src)
          expect(image?.attrs?.alt).toBe(alt)
          expect(image?.attrs?.width).toBe(width)
          expect(image?.attrs?.height).toBe(height)
        },
      ),
      { numRuns: 100 },
    )
  })
})
