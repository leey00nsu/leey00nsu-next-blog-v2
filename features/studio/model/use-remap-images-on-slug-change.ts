import { useEffect, useMemo, useRef, useState } from 'react'
import type { MDXEditorMethods } from '@mdxeditor/editor'
import type { Frontmatter } from '@/entities/studio/model/frontmatter-schema'
import type { PendingImageMap } from '@/features/editor/model/types'
import {
  collectUsedImageSrcs,
  remapPendingImagesSlug,
  rewriteImagePathSlug,
  rewriteMarkdownImagePaths,
} from '@/features/editor/lib/image-utils'
import { STUDIO } from '@/features/studio/config/constants'
import { FRONTMATTER_BLOCK_REGEX } from '@/shared/config/constants'

interface UseRemapImagesOnSlugChangeParams {
  slug?: string
  markdown: string
  setMarkdown: React.Dispatch<React.SetStateAction<string>>
  pendingImages: PendingImageMap
  setPendingImages: React.Dispatch<React.SetStateAction<PendingImageMap>>
  setFrontMatter: React.Dispatch<React.SetStateAction<Frontmatter | undefined>>
  editorRef: React.MutableRefObject<MDXEditorMethods | null>
}

export function useRemapImagesOnSlugChange({
  slug,
  markdown,
  setMarkdown,
  pendingImages,
  setPendingImages,
  setFrontMatter,
  editorRef,
}: UseRemapImagesOnSlugChangeParams) {
  // 내부 디바운스된 slug 상태
  const [debouncedSlug, setDebouncedSlug] = useState<string | undefined>(slug)
  const prevSlugRef = useRef<string | undefined>(undefined)

  // 슬러그 디바운싱: 빈번한 입력 시 과도한 리매핑 방지
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSlug(slug), STUDIO.SLUG_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [slug])

  // 본문 부분만 분리하는 헬퍼
  const bodyOnly = useMemo(
    () => markdown.replace(FRONTMATTER_BLOCK_REGEX, ''),
    [markdown],
  )

  useEffect(() => {
    const prevSlug = prevSlugRef.current
    const s = debouncedSlug
    if (!((s && s !== prevSlug) || (!s && prevSlug))) {
      return
    }

    // 미리 새 pending 맵을 계산 (썸네일 유효성 판단에도 활용)
    const nextPending = remapPendingImagesSlug(pendingImages, prevSlug, s ?? '')

    setMarkdown((prev) => {
      const next = rewriteMarkdownImagePaths(prev, prevSlug, s ?? '')
      if (next !== prev) {
        // MDXEditor는 마운트 후 markdown prop 변화를 반영하지 않으므로 API로 동기화
        editorRef.current?.setMarkdown(next)
      }

      // 본문 기준 사용 이미지 재계산 후 썸네일 경로도 함께 갱신
      const nextBody = next.replace(FRONTMATTER_BLOCK_REGEX, '')
      const usedAfter = collectUsedImageSrcs(nextBody)
      setFrontMatter((fm) => {
        if (!fm) return fm
        if (typeof fm.thumbnail === 'string') {
          const remapped = rewriteImagePathSlug(fm.thumbnail, prevSlug, s ?? '')
          const valid = usedAfter.has(remapped) && !!nextPending[remapped]
          return { ...fm, thumbnail: valid ? remapped : null }
        }
        return fm
      })

      return next
    })

    setPendingImages((prev) => remapPendingImagesSlug(prev, prevSlug, s ?? ''))
    prevSlugRef.current = s
  }, [
    debouncedSlug,
    editorRef,
    pendingImages,
    setFrontMatter,
    setMarkdown,
    setPendingImages,
  ])
}
