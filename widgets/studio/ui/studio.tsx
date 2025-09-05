'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MDXEditorMethods } from '@mdxeditor/editor'
import { FrontmatterForm } from '@/features/studio/ui/frontmatter-form'
import { Frontmatter } from '@/entities/studio/model/frontmatter-schema'
import { formatFrontmatter } from '@/entities/studio/lib/format-frontmatter'
import { Button } from '@/shared/ui/button'
import type { PendingImageMap } from '@/features/editor/model/types'
import {
  remapPendingImagesSlug,
  rewriteMarkdownImagePaths,
  collectUsedImageSrcs,
} from '@/features/editor/lib/image-utils'

const Editor = dynamic(() => import('@/features/editor/ui/editor'), {
  ssr: false,
})

type StudioProps = {
  existingSlugs: string[]
  existingTags: string[]
}

export function Studio({ existingSlugs, existingTags }: StudioProps) {
  const [markdown, setMarkdown] = useState('')
  const [frontMatter, setFrontMatter] = useState<Frontmatter | undefined>()
  const [pendingImages, setPendingImages] = useState<PendingImageMap>({})
  const editorRef = useRef<MDXEditorMethods | null>(null)

  const bodyMarkdown = useMemo(
    () => markdown.replace(/^---[\s\S]*?---\n?/, ''),
    [markdown],
  )
  const finalMarkdown = useMemo(() => {
    if (!frontMatter) return bodyMarkdown
    return `${formatFrontmatter(frontMatter)}${bodyMarkdown}`
  }, [frontMatter, bodyMarkdown])

  const save = () => {
    // 본문에서 사용 중인 이미지 경로만 추출 (frontmatter 제외)
    const usedSrcs = collectUsedImageSrcs(bodyMarkdown)

    // pendingImages 중 실제 사용되는 항목만 남기고, 사용되지 않는 항목은 objectURL 해제 후 제거
    const filtered: PendingImageMap = {}
    for (const [path, entry] of Object.entries(pendingImages)) {
      if (usedSrcs.has(path)) {
        filtered[path] = entry
      } else {
        URL.revokeObjectURL(entry.objectURL)
      }
    }
    setPendingImages(filtered)

    // 최종 로그 및 업로드 연동 지점
    console.log('[FINAL MARKDOWN]', finalMarkdown)
    console.log('[PENDING IMAGES USED]', Object.keys(filtered))

    // TODO: API 연동하여 filtered[path].file 업로드 후 파일 저장
  }

  const handleAddPendingImage = useCallback((path: string, file: File) => {
    setPendingImages((prev) => {
      const prevEntry = prev[path]
      if (prevEntry) URL.revokeObjectURL(prevEntry.objectURL)
      const objectURL = URL.createObjectURL(file)
      return { ...prev, [path]: { file, objectURL } }
    })
  }, [])

  // 슬러그 변경 시: 마크다운 내 이미지 경로와 pendingImages 키를 모두 새 슬러그로 갱신
  // - '/public/posts/{old}/...' -> '/public/posts/{next}/...'
  // - '/public/posts/.../...'   -> '/public/posts/{next}/...'
  const currentSlug = frontMatter?.slug
  const prevSlugRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    const prevSlug = prevSlugRef.current
    if (currentSlug && currentSlug !== prevSlug) {
      setMarkdown((prev) => {
        const next = rewriteMarkdownImagePaths(prev, prevSlug, currentSlug)
        if (next !== prev) {
          // MDXEditor는 마운트 후 markdown prop 변화를 반영하지 않으므로 API로 동기화합니다.
          editorRef.current?.setMarkdown(next)
        }
        return next
      })
      setPendingImages((prev) =>
        remapPendingImagesSlug(prev, prevSlug, currentSlug),
      )
    }
    prevSlugRef.current = currentSlug
  }, [currentSlug])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <FrontmatterForm
        value={frontMatter}
        onChange={setFrontMatter}
        existingSlugs={existingSlugs}
        suggestionTags={existingTags}
      />
      <Editor
        editorRef={editorRef}
        value={markdown}
        fieldChange={setMarkdown}
        slug={frontMatter?.slug}
        pendingImages={pendingImages}
        onAddPendingImage={handleAddPendingImage}
      />
      <Button disabled={!frontMatter || !markdown} onClick={save}>
        저장
      </Button>
    </div>
  )
}
