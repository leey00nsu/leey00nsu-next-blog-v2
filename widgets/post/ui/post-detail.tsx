import { Post } from '@/entities/post/model/types'

import { MdxRenderer } from '@/features/mdx/ui/mdx-renderer'
import { getTableOfContents } from '@/shared/lib/toc'
import { Toc } from '@/features/post/ui/toc'
import { TocRegister } from '@/features/post/ui/toc-register'
import { GiscusComments } from '@/features/post/ui/giscus-comments'
import { TagList } from '@/features/post/ui/tag-list'
import { ShareButton } from '@/features/post/ui/share-button'
import { buildBlogTagHref } from '@/shared/config/constants'

interface PostDetailProps {
  post: Post
}

export function PostDetail({ post }: PostDetailProps) {
  const headings = getTableOfContents(post.content)

  return (
    <div className="relative">
      <TocRegister headings={headings} />
      <article className="prose prose-lg dark:prose-invert mx-auto">
        <div className="flex items-center gap-2">
          <span>{post.date.toLocaleDateString('ko-KR')}</span>
          <span>{post.writer}</span>
        </div>
        <h1>{post.title}</h1>
        <div className="my-4 flex justify-center gap-2">
          <ShareButton />
        </div>
        <TagList tags={post.tags} hrefBuilder={buildBlogTagHref} />
        <hr />
        <Toc headings={headings} className="md:hidden" />
        <MdxRenderer content={post.content} />
      </article>

      <section className="mx-auto py-8">
        <GiscusComments />
      </section>
    </div>
  )
}
