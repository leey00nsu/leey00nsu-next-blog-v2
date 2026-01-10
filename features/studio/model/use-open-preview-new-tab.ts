import { useState, useCallback } from 'react'
import type { Frontmatter } from '@/entities/studio/model/frontmatter-schema'
import type { PendingImageMap } from '@/features/editor/model/types'
import { createPreview } from '@/features/studio/api/preview'
import { convertPendingImagesToBase64 } from '@/features/studio/lib/convert-pending-images-to-base64'

interface UseOpenPreviewNewTabParams {
  frontMatter: Frontmatter | undefined
  bodyMarkdown: string
  pendingImages: PendingImageMap
}

export function useOpenPreviewNewTab({
  frontMatter,
  bodyMarkdown,
  pendingImages,
}: UseOpenPreviewNewTabParams) {
  const [isOpeningPreview, setIsOpeningPreview] = useState(false)

  const openPreviewNewTab = useCallback(async () => {
    if (!frontMatter) return

    setIsOpeningPreview(true)
    try {
      const pendingImagesBase64 =
        await convertPendingImagesToBase64(pendingImages)

      const { id } = await createPreview({
        content: bodyMarkdown,
        title: frontMatter.title,
        description: frontMatter.description,
        writer: frontMatter.writer,
        date: frontMatter.date,
        tags: frontMatter.tags,
        pendingImages: pendingImagesBase64,
      })

      window.open(`/studio/preview?id=${id}`, '_blank')
    } catch (error) {
      console.error('미리보기 열기 실패:', error)
    } finally {
      setIsOpeningPreview(false)
    }
  }, [frontMatter, bodyMarkdown, pendingImages])

  return { isOpeningPreview, openPreviewNewTab }
}
