import type { ReactNode } from 'react'
import type { Post } from '@/entities/post/model/types'
import type { TocHeading } from '@/shared/lib/toc'
import { Toc } from '@/features/post/ui/toc'
import { TocRegister } from '@/features/post/ui/toc-register'
import { GiscusComments } from '@/features/post/ui/giscus-comments'
import { TagList } from '@/features/post/ui/tag-list'
import { ShareButton } from '@/features/post/ui/share-button'
import { buildBlogTagHref } from '@/shared/config/constants'
import type { SupportedLocale } from '@/shared/config/constants'
import { JsonLd } from '@/shared/ui/json-ld'
import { EntranceMotionBlock } from '@/shared/ui/entrance-motion-block'

const POST_DETAIL_BLOCK_ANIMATION = {
  HEADER_DELAY_SECONDS: 0,
  CONTENT_DELAY_SECONDS: 0.06,
  COMMENTS_DELAY_SECONDS: 0.12,
} as const

interface PostDetailViewProps {
  post: Post
  locale: SupportedLocale
  headings: TocHeading[]
  jsonLdData?: React.ComponentProps<typeof JsonLd>['data']
  children?: ReactNode
  showComments?: boolean
}

export function PostDetailView({
  post,
  locale,
  headings,
  jsonLdData,
  children,
  showComments = true,
}: PostDetailViewProps) {
  return (
    <div className="relative">
      {jsonLdData ? <JsonLd data={jsonLdData} /> : null}
      <TocRegister headings={headings} />
      <article className="prose prose-lg dark:prose-invert mx-auto">
        <EntranceMotionBlock
          delaySeconds={POST_DETAIL_BLOCK_ANIMATION.HEADER_DELAY_SECONDS}
        >
          <div className="flex items-center gap-2">
            <span>{post.date.toLocaleDateString('ko-KR')}</span>
            <span>{post.writer}</span>
          </div>
          <h1>{post.title}</h1>
          <div className="my-4 flex justify-center gap-2">
            <ShareButton />
          </div>
          <TagList
            tags={post.tags}
            hrefBuilder={(tag) => buildBlogTagHref(tag, locale)}
          />
          <hr />
          <Toc headings={headings} className="md:hidden" />
        </EntranceMotionBlock>
        <EntranceMotionBlock
          delaySeconds={POST_DETAIL_BLOCK_ANIMATION.CONTENT_DELAY_SECONDS}
        >
          {children}
        </EntranceMotionBlock>
      </article>

      {showComments ? (
        <EntranceMotionBlock
          delaySeconds={POST_DETAIL_BLOCK_ANIMATION.COMMENTS_DELAY_SECONDS}
        >
          <section className="mx-auto py-8">
            <GiscusComments />
          </section>
        </EntranceMotionBlock>
      ) : null}
    </div>
  )
}
