'use client'

import dynamic from 'next/dynamic'
import { useCallback, useMemo, useRef, useState } from 'react'
import type { FieldErrors } from 'react-hook-form'
import type { MDXEditorMethods } from '@mdxeditor/editor'
import { FrontmatterForm } from '@/features/studio/ui/frontmatter-form'
import { Frontmatter } from '@/entities/studio/model/frontmatter-schema'
import { formatFrontmatter } from '@/entities/studio/lib/format-frontmatter'
import { Button } from '@/shared/ui/button'
import type { PendingImageMap } from '@/features/editor/model/types'
import { collectUsedImageSrcs } from '@/features/editor/lib/image-utils'
import { signOut } from 'next-auth/react'
import { useCommitPost } from '@/features/studio/model/use-commit-post'
import { Loader2 } from 'lucide-react'
import { useRemapImagesOnSlugChange } from '@/features/studio/model/use-remap-images-on-slug-change'

const Editor = dynamic(
  () => import('@/features/editor/ui/editor').then((m) => m.Editor),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    ),
  },
)

export interface StudioProps {
  existingSlugs: string[]
  existingTags: string[]
}

export function Studio({ existingSlugs, existingTags }: StudioProps) {
  const [markdown, setMarkdown] = useState('')
  const [frontMatter, setFrontMatter] = useState<Frontmatter | undefined>()
  const [pendingImages, setPendingImages] = useState<PendingImageMap>({})
  const [isFrontmatterValid, setIsFrontmatterValid] = useState(false)
  const { isSaving, commitPost } = useCommitPost()
  const editorRef = useRef<MDXEditorMethods | null>(null)

  const bodyMarkdown = useMemo(
    () => markdown.replace(/^---[\s\S]*?---\n?/, ''),
    [markdown],
  )
  const finalMarkdown = useMemo(() => {
    if (!frontMatter) return bodyMarkdown
    return `${formatFrontmatter(frontMatter)}${bodyMarkdown}`
  }, [frontMatter, bodyMarkdown])

  // 본문에서 사용 중인 pending 이미지들을 썸네일 후보로 표시
  const usedSrcs = useMemo(
    () => collectUsedImageSrcs(bodyMarkdown),
    [bodyMarkdown],
  )
  const thumbnailChoices = useMemo(
    () =>
      Object.entries(pendingImages)
        .filter(([path]) => usedSrcs.has(path))
        .map(([path, entry]) => ({ path, previewUrl: entry.objectURL })),
    [pendingImages, usedSrcs],
  )

  const handleFrontmatterChange = useCallback(
    (fm: Frontmatter) => {
      setFrontMatter(fm)
    },
    [],
  )

  const save = async () => {
    const { filteredPending } = await commitPost({
      frontMatter,
      bodyMarkdown,
      finalMarkdown,
      pendingImages,
    })
    setPendingImages(filteredPending)
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
  useRemapImagesOnSlugChange({
    slug: frontMatter?.slug,
    markdown,
    setMarkdown,
    pendingImages,
    setPendingImages,
    setFrontMatter,
    editorRef,
  })

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <FrontmatterForm
        value={frontMatter}
        onChange={handleFrontmatterChange}
        onValidityChange={setIsFrontmatterValid}
        existingSlugs={existingSlugs}
        suggestionTags={existingTags}
        thumbnailChoices={thumbnailChoices}
      />
      <Editor
        editorRef={editorRef}
        value={markdown}
        fieldChange={setMarkdown}
        slug={frontMatter?.slug}
        pendingImages={pendingImages}
        onAddPendingImage={handleAddPendingImage}
      />
      <Button
        disabled={
          !isFrontmatterValid || bodyMarkdown.trim().length === 0 || isSaving
        }
        onClick={save}
      >
        {isSaving ? (
          <>
            <Loader2 className="animate-spin" /> 저장 중
          </>
        ) : (
          '저장'
        )}
      </Button>
      <Button onClick={() => signOut()}>로그아웃</Button>
    </div>
  )
}
