'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { PostPreviewDetail } from '@/widgets/studio-preview/ui/post-preview-detail'
import { useTranslations } from 'next-intl'
import { Loader2, AlertCircle } from 'lucide-react'
import { getPreview } from '@/features/studio/api/preview'
import type { PreviewData } from '@/entities/studio/model/preview-types'

export function StudioPreviewClient() {
  const t = useTranslations('studio.preview')
  const searchParams = useSearchParams()
  const previewId = searchParams.get('id')

  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!previewId) {
      setError(t('notFound'))
      setIsLoading(false)
      return
    }

    const fetchPreview = async () => {
      try {
        const data = await getPreview(previewId)
        setPreviewData(data)
      } catch (error_) {
        if (error_ instanceof Error && error_.message === 'PREVIEW_EXPIRED') {
          setError(t('expired'))
        } else {
          setError(t('notFound'))
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchPreview()
  }, [previewId, t])

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="text-muted-foreground animate-spin" size={32} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <AlertCircle className="text-destructive" size={48} />
        <p className="text-muted-foreground text-lg">{error}</p>
      </div>
    )
  }

  if (!previewData) {
    return null
  }

  return (
    <PostPreviewDetail
      post={{
        title: previewData.title,
        description: previewData.description,
        writer: previewData.writer,
        date: previewData.date,
        tags: previewData.tags,
        content: previewData.content,
      }}
      pendingImages={previewData.pendingImages}
    />
  )
}
