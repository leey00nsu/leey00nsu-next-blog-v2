import { useEffect, useRef, useState } from 'react'
import type { TiptapEditorMethods } from '@/features/editor/ui/tiptap-editor'
import type { Frontmatter } from '@/entities/studio/model/frontmatter-schema'
import type { PendingImageMap } from '@/features/editor/model/types'
import {
  collectUsedImageSrcs,
  remapPendingImagesSlug,
  rewriteImagePathSlug,
  rewriteMarkdownImagePaths,
} from '@/features/editor/lib/image-utils'
import { setPendingImagesStore } from '@/features/editor/model/pending-images-store'
import { STUDIO } from '@/features/studio/config/constants'
import { FRONTMATTER_BLOCK_REGEX } from '@/shared/config/constants'

interface UseRemapImagesOnSlugChangeParams {
  slug?: string
  markdown: string
  setMarkdown: React.Dispatch<React.SetStateAction<string>>
  pendingImages: PendingImageMap
  setPendingImages: React.Dispatch<React.SetStateAction<PendingImageMap>>
  setFrontMatter: React.Dispatch<React.SetStateAction<Frontmatter | undefined>>
  editorRef: React.MutableRefObject<TiptapEditorMethods | null>
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

  useEffect(() => {
    const prevSlug = prevSlugRef.current
    const s = debouncedSlug
    if (!((s && s !== prevSlug) || (!s && prevSlug))) {
      return
    }

    // 미리 새 pending 맵을 계산 (썸네일 유효성 판단에도 활용)
    const nextPending = remapPendingImagesSlug(pendingImages, prevSlug, s ?? '')

    // 전역 스토어를 먼저 업데이트 (에디터 렌더링 전에 새 경로로 objectURL 매핑)
    setPendingImagesStore(nextPending)

    // 마크다운 경로 재작성
    const nextMarkdown = rewriteMarkdownImagePaths(markdown, prevSlug, s ?? '')
    if (nextMarkdown !== markdown) {
      setMarkdown(nextMarkdown)
      // TiptapEditor는 마운트 후 markdown prop 변화를 반영하지 않으므로 API로 동기화
      editorRef.current?.setMarkdown(nextMarkdown)
    }

    // 본문 기준 사용 이미지 재계산 후 썸네일 경로도 함께 갱신
    const nextBody = nextMarkdown.replace(FRONTMATTER_BLOCK_REGEX, '')
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

    setPendingImages((prev) => remapPendingImagesSlug(prev, prevSlug, s ?? ''))
    prevSlugRef.current = s
  }, [
    debouncedSlug,
    editorRef,
    markdown,
    pendingImages,
    setFrontMatter,
    setMarkdown,
    setPendingImages,
  ])
}
