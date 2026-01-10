'use client'

import { MdxClientRenderer } from '@/features/mdx/ui/mdx-client-renderer'
import { getTableOfContents } from '@/shared/lib/toc'
import { Toc } from '@/features/post/ui/toc'
import { TagList } from '@/features/post/ui/tag-list'
import { buildBlogTagHref } from '@/shared/config/constants'
import { useTranslations } from 'next-intl'
import { AlertTriangle } from 'lucide-react'

interface PreviewPost {
  title: string
  description: string
  writer: string
  date: string
  tags: string[]
  content: string
}

interface PostPreviewDetailProps {
  post: PreviewPost
  pendingImages?: Record<string, string> // path -> base64 data URL
}

export function PostPreviewDetail({
  post,
  pendingImages = {},
}: PostPreviewDetailProps) {
  const t = useTranslations('studio.preview')
  const headings = getTableOfContents(post.content)

  const displayDate = post.date
    ? new Date(post.date).toLocaleDateString('ko-KR')
    : new Date().toLocaleDateString('ko-KR')

  // Base64 이미지 맵을 MdxClientRenderer용 PendingImageMap 형태로 변환
  // MdxClientRenderer에서는 객체의 objectURL 속성을 사용
  const pendingImagesForRenderer = Object.fromEntries(
    Object.entries(pendingImages).map(([path, base64]) => [
      path,
      { objectURL: base64, file: null as unknown as File },
    ]),
  )

  return (
    <div className="relative">
      {/* 미리보기 배너 */}
      <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-100 p-4 dark:border-amber-700 dark:bg-amber-900/30">
        <AlertTriangle
          className="shrink-0 text-amber-600 dark:text-amber-400"
          size={20}
        />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          {t('banner')}
        </p>
      </div>

      <article className="prose prose-lg dark:prose-invert mx-auto">
        <div className="flex items-center gap-2">
          <span>{displayDate}</span>
          {post.writer && <span>{post.writer}</span>}
        </div>
        <h1>{post.title || '(제목 없음)'}</h1>
        {post.tags.length > 0 && (
          <TagList tags={post.tags} hrefBuilder={buildBlogTagHref} />
        )}
        <hr />
        <Toc headings={headings} className="md:hidden" />
        <MdxClientRenderer
          content={post.content}
          pendingImages={pendingImagesForRenderer}
        />
      </article>
    </div>
  )
}
