import { useState } from 'react'
import { toast } from 'sonner'
import type { Frontmatter } from '@/entities/studio/model/frontmatter-schema'
import type { PendingImageMap } from '@/features/editor/model/types'
import { collectUsedImageSrcs } from '@/features/editor/lib/image-utils'
import { commitPost as commitPostApi } from '@/features/studio/api/commit-post'
import { STUDIO } from '@/features/studio/config/constants'
import { useTranslations } from 'next-intl'

interface CommitArgs {
  frontMatter?: Frontmatter
  bodyMarkdown: string
  finalMarkdown: string
  pendingImages: PendingImageMap
}

interface CommitResult {
  ok: boolean
  filteredPending: PendingImageMap
}

export function useCommitPost() {
  const [isSaving, setIsSaving] = useState(false)
  const t = useTranslations('studio.toasts')

  const commitPost = async ({
    frontMatter,
    bodyMarkdown,
    finalMarkdown,
    pendingImages,
  }: CommitArgs): Promise<CommitResult> => {
    if (isSaving) return { ok: false, filteredPending: pendingImages }

    setIsSaving(true)

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

    try {
      if (!frontMatter?.slug) {
        toast.error(t('missingSlug'))
        return { ok: false, filteredPending: filtered }
      }

      const form = new FormData()
      form.append(STUDIO.COMMIT_FIELDS.SLUG, frontMatter.slug)
      form.append(STUDIO.COMMIT_FIELDS.MDX, finalMarkdown)

      for (const [path, entry] of Object.entries(filtered)) {
        const file = entry.file as File | undefined
        if (!file) continue
        form.append(STUDIO.COMMIT_FIELDS.IMAGE_PATHS, path)
        form.append(STUDIO.COMMIT_FIELDS.IMAGES, file, file.name)
      }

      const json = await commitPostApi(form)
      if (!json.ok) {
        console.error('Commit failed', json)
        toast.error(t('commitFailed', { reason: json.error ?? 'Unknown error' }))
        return { ok: false, filteredPending: filtered }
      }

      toast.success(t('commitSuccess'))
      return { ok: true, filteredPending: filtered }
    } catch (error) {
      console.error(error)
      toast.error(t('commitError'))
      return { ok: false, filteredPending: filtered }
    } finally {
      setIsSaving(false)
    }
  }

  return { isSaving, commitPost }
}
