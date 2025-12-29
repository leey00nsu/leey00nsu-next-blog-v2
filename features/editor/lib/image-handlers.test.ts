/**
 * 이미지 핸들러 Property 테스트
 *
 * Property 5: 이미지 경로 생성 일관성
 * Property 6: pendingImages 관리
 *
 * _Validates: Requirements 5.5, 8.2, 8.3_
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  buildUniquePath,
  sanitizeFilename,
  rewriteMarkdownImagePaths,
  remapPendingImagesSlug,
  rewriteImagePathSlug,
  collectUsedImageSrcs,
  PUBLIC_POSTS_BASE,
} from '@/features/editor/lib/image-utils'
import { makeImageHandlers } from '@/features/editor/lib/image-handlers'
import type { PendingImageMap } from '@/features/editor/model/types'

const TEST_ITERATIONS = 100

// 유효한 슬러그 생성 arbitrary
const slugArbitrary = fc.stringMatching(/^[a-z0-9-]{1,50}$/)

// 유효한 파일명 생성 arbitrary
const filenameArbitrary = fc.stringMatching(/^[a-zA-Z0-9._-]{1,30}\.(png|jpg|jpeg|gif|webp)$/)

// 간단한 파일명 arbitrary (sanitize 테스트용)
const rawFilenameArbitrary = fc.string({ minLength: 1, maxLength: 50 })

describe('Property 5: 이미지 경로 생성 일관성', () => {
  it('sanitizeFilename은 항상 소문자, 허용 문자만 포함된 결과를 반환한다', () => {
    fc.assert(
      fc.property(rawFilenameArbitrary, (filename) => {
        const sanitized = sanitizeFilename(filename)

        // 결과는 소문자만 포함
        expect(sanitized).toBe(sanitized.toLowerCase())

        // 허용된 문자만 포함 (a-z, 0-9, ., _, -)
        expect(sanitized).toMatch(/^[a-z0-9._-]*$/)

        // 공백이 하이픈으로 변환됨
        if (filename.includes(' ')) {
          expect(sanitized).not.toContain(' ')
        }
      }),
      { numRuns: TEST_ITERATIONS },
    )
  })

  it('buildUniquePath는 항상 PUBLIC_POSTS_BASE로 시작하는 경로를 반환한다', () => {
    fc.assert(
      fc.property(
        fc.option(slugArbitrary, { nil: undefined }),
        filenameArbitrary,
        (slug, filename) => {
          const pendingImages: PendingImageMap = {}
          const path = buildUniquePath(slug, filename, pendingImages)

          // 경로는 PUBLIC_POSTS_BASE로 시작
          expect(path.startsWith(PUBLIC_POSTS_BASE)).toBe(true)

          // 슬러그가 있으면 슬러그 폴더, 없으면 임시 폴더
          if (slug) {
            expect(path).toContain(`/${slug}/`)
          } else {
            expect(path).toContain('/.../') 
          }
        },
      ),
      { numRuns: TEST_ITERATIONS },
    )
  })

  it('buildUniquePath는 중복 경로가 있을 때 고유한 경로를 생성한다', () => {
    fc.assert(
      fc.property(slugArbitrary, filenameArbitrary, (slug, filename) => {
        const pendingImages: PendingImageMap = {}

        // 첫 번째 경로 생성
        const path1 = buildUniquePath(slug, filename, pendingImages)
        pendingImages[path1] = { objectURL: 'blob:test1' }

        // 두 번째 경로 생성 (같은 파일명)
        const path2 = buildUniquePath(slug, filename, pendingImages)
        pendingImages[path2] = { objectURL: 'blob:test2' }

        // 세 번째 경로 생성 (같은 파일명)
        const path3 = buildUniquePath(slug, filename, pendingImages)

        // 모든 경로가 고유해야 함
        expect(path1).not.toBe(path2)
        expect(path2).not.toBe(path3)
        expect(path1).not.toBe(path3)

        // 두 번째, 세 번째 경로는 숫자 접미사를 가짐
        expect(path2).toMatch(/-1\.[a-z]+$/)
        expect(path3).toMatch(/-2\.[a-z]+$/)
      }),
      { numRuns: TEST_ITERATIONS },
    )
  })

  it('rewriteImagePathSlug는 경로의 슬러그 부분만 변경한다', () => {
    fc.assert(
      fc.property(
        slugArbitrary,
        slugArbitrary,
        filenameArbitrary,
        (oldSlug, newSlug, filename) => {
          const originalPath = `${PUBLIC_POSTS_BASE}/${oldSlug}/${filename}`
          const rewrittenPath = rewriteImagePathSlug(originalPath, oldSlug, newSlug)

          // 새 슬러그로 변경됨
          expect(rewrittenPath).toBe(`${PUBLIC_POSTS_BASE}/${newSlug}/${filename}`)

          // 파일명은 유지됨
          expect(rewrittenPath.endsWith(filename)).toBe(true)
        },
      ),
      { numRuns: TEST_ITERATIONS },
    )
  })

  it('임시 경로(...)도 새 슬러그로 올바르게 변환된다', () => {
    fc.assert(
      fc.property(slugArbitrary, filenameArbitrary, (newSlug, filename) => {
        const tempPath = `${PUBLIC_POSTS_BASE}/.../` + filename
        const rewrittenPath = rewriteImagePathSlug(tempPath, null, newSlug)

        expect(rewrittenPath).toBe(`${PUBLIC_POSTS_BASE}/${newSlug}/${filename}`)
      }),
      { numRuns: TEST_ITERATIONS },
    )
  })
})


describe('Property 6: pendingImages 관리', () => {
  it('makeImageHandlers.imageUploadHandler는 고유한 경로를 생성하고 콜백을 호출한다', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.option(slugArbitrary, { nil: undefined }),
        filenameArbitrary,
        async (slug, filename) => {
          const pendingImages: PendingImageMap = {}
          const addedPaths: string[] = []

          const { imageUploadHandler } = makeImageHandlers({
            slug,
            pendingImages,
            onAddPendingImage: (path) => {
              addedPaths.push(path)
            },
          })

          // 테스트용 File 객체 생성
          const file = new File(['test'], filename, { type: 'image/png' })
          const path = await imageUploadHandler(file)

          // 경로가 반환됨
          expect(path).toBeTruthy()
          expect(path.startsWith(PUBLIC_POSTS_BASE)).toBe(true)

          // 콜백이 호출됨
          expect(addedPaths).toContain(path)
        },
      ),
      { numRuns: TEST_ITERATIONS },
    )
  })

  it('makeImageHandlers.imagePreviewHandler는 pendingImages에 있는 경로를 objectURL로 변환한다', async () => {
    await fc.assert(
      fc.asyncProperty(slugArbitrary, filenameArbitrary, async (slug, filename) => {
        const testObjectURL = `blob:http://localhost/${Math.random()}`
        const path = `${PUBLIC_POSTS_BASE}/${slug}/${filename}`

        const pendingImages: PendingImageMap = {
          [path]: { objectURL: testObjectURL },
        }

        const { imagePreviewHandler } = makeImageHandlers({
          slug,
          pendingImages,
        })

        // pendingImages에 있는 경로는 objectURL 반환
        const result = await imagePreviewHandler(path)
        expect(result).toBe(testObjectURL)

        // pendingImages에 없는 경로는 원본 반환
        const unknownPath = `${PUBLIC_POSTS_BASE}/${slug}/unknown.png`
        const unknownResult = await imagePreviewHandler(unknownPath)
        expect(unknownResult).toBe(unknownPath)
      }),
      { numRuns: TEST_ITERATIONS },
    )
  })

  it('remapPendingImagesSlug는 모든 키의 슬러그를 올바르게 변경한다', () => {
    fc.assert(
      fc.property(
        slugArbitrary,
        slugArbitrary,
        fc.array(filenameArbitrary, { minLength: 1, maxLength: 5 }),
        (oldSlug, newSlug, filenames) => {
          const pendingImages: PendingImageMap = {}

          // 원본 pendingImages 생성
          for (const filename of filenames) {
            const path = `${PUBLIC_POSTS_BASE}/${oldSlug}/${filename}`
            pendingImages[path] = { objectURL: `blob:${filename}` }
          }

          const remapped = remapPendingImagesSlug(pendingImages, oldSlug, newSlug)

          // 모든 키가 새 슬러그로 변경됨
          for (const key of Object.keys(remapped)) {
            expect(key).toContain(`/${newSlug}/`)
            expect(key).not.toContain(`/${oldSlug}/`)
          }

          // 항목 수는 동일
          expect(Object.keys(remapped).length).toBe(Object.keys(pendingImages).length)

          // objectURL 값은 유지됨
          for (const filename of filenames) {
            const newPath = `${PUBLIC_POSTS_BASE}/${newSlug}/${filename}`
            expect(remapped[newPath]?.objectURL).toBe(`blob:${filename}`)
          }
        },
      ),
      { numRuns: TEST_ITERATIONS },
    )
  })

  it('임시 폴더(...)의 pendingImages도 새 슬러그로 올바르게 변환된다', () => {
    fc.assert(
      fc.property(
        slugArbitrary,
        fc.array(filenameArbitrary, { minLength: 1, maxLength: 5 }),
        (newSlug, filenames) => {
          const pendingImages: PendingImageMap = {}

          // 임시 폴더 경로로 pendingImages 생성
          for (const filename of filenames) {
            const path = `${PUBLIC_POSTS_BASE}/.../` + filename
            pendingImages[path] = { objectURL: `blob:${filename}` }
          }

          const remapped = remapPendingImagesSlug(pendingImages, null, newSlug)

          // 모든 키가 새 슬러그로 변경됨
          for (const key of Object.keys(remapped)) {
            expect(key).toContain(`/${newSlug}/`)
            expect(key).not.toContain('/.../')
          }
        },
      ),
      { numRuns: TEST_ITERATIONS },
    )
  })

  it('rewriteMarkdownImagePaths는 마크다운 내 이미지 경로를 올바르게 변환한다', () => {
    fc.assert(
      fc.property(
        slugArbitrary,
        slugArbitrary,
        filenameArbitrary,
        fc.string({ minLength: 0, maxLength: 50 }),
        (oldSlug, newSlug, filename, altText) => {
          // oldSlug와 newSlug가 같으면 테스트 스킵
          fc.pre(oldSlug !== newSlug)

          const safeAlt = altText.replaceAll(/[\[\]()]/g, '')
          const markdown = `# Title\n\n![${safeAlt}](${PUBLIC_POSTS_BASE}/${oldSlug}/${filename})\n\nSome text`

          const rewritten = rewriteMarkdownImagePaths(markdown, oldSlug, newSlug)

          // 이미지 경로가 새 슬러그로 변경됨
          expect(rewritten).toContain(`${PUBLIC_POSTS_BASE}/${newSlug}/${filename}`)
          expect(rewritten).not.toContain(`${PUBLIC_POSTS_BASE}/${oldSlug}/${filename}`)

          // 다른 내용은 유지됨
          expect(rewritten).toContain('# Title')
          expect(rewritten).toContain('Some text')
        },
      ),
      { numRuns: TEST_ITERATIONS },
    )
  })

  it('collectUsedImageSrcs는 마크다운에서 모든 이미지 경로를 수집한다', () => {
    fc.assert(
      fc.property(
        slugArbitrary,
        fc.array(filenameArbitrary, { minLength: 1, maxLength: 5 }),
        (slug, filenames) => {
          // 중복 제거
          const uniqueFilenames = [...new Set(filenames)]

          // 마크다운 이미지 문법으로 마크다운 생성
          const markdownImages = uniqueFilenames
            .map((f) => `![alt](${PUBLIC_POSTS_BASE}/${slug}/${f})`)
            .join('\n\n')

          const markdown = `# Title\n\n${markdownImages}\n\nSome text`

          const collected = collectUsedImageSrcs(markdown)

          // 모든 이미지 경로가 수집됨
          for (const filename of uniqueFilenames) {
            const expectedPath = `${PUBLIC_POSTS_BASE}/${slug}/${filename}`
            expect(collected.has(expectedPath)).toBe(true)
          }

          // 수집된 경로 수가 일치
          expect(collected.size).toBe(uniqueFilenames.length)
        },
      ),
      { numRuns: TEST_ITERATIONS },
    )
  })

  it('collectUsedImageSrcs는 HTML img 태그도 수집한다', () => {
    fc.assert(
      fc.property(slugArbitrary, filenameArbitrary, (slug, filename) => {
        const imgPath = `${PUBLIC_POSTS_BASE}/${slug}/${filename}`
        const markdown = `# Title\n\n<img src="${imgPath}" alt="test" />\n\nSome text`

        const collected = collectUsedImageSrcs(markdown)

        expect(collected.has(imgPath)).toBe(true)
      }),
      { numRuns: TEST_ITERATIONS },
    )
  })
})
