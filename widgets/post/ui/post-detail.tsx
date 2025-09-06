import { Post } from '@/entities/post/model/types'

import { MdxRenderer } from '@/features/mdx/ui/mdx-renderer'
import { getTableOfContents } from '@/lib/toc'
import { Toc } from '@/features/post/ui/toc'
import { GiscusComments } from '@/features/post/ui/giscus-comments'
import { TagList } from '@/features/post/ui/tag-list'

interface PostDetailProps {
  post: Post
}

export function PostDetail({ post }: PostDetailProps) {
  const headings = getTableOfContents(post.content)

  return (
    <div className="relative">
      <article className="prose prose-lg dark:prose-invert mx-auto">
        <div className="flex items-center gap-2">
          <span>{post.date.toLocaleDateString('ko-KR')}</span>
          <span>{'·'}</span>
          <span>{post.writer}</span>
        </div>
        <h1>{post.title}</h1>
        <TagList
          tags={post.tags}
          hrefBuilder={(t) => `/blog?tag=${encodeURIComponent(t)}`}
        />
        <hr />
        <Toc headings={headings} className="md:hidden" />
        <MdxRenderer content={post.content} />
      </article>

      <section className="mx-auto py-8">
        <GiscusComments />
      </section>

      <div className="absolute top-0 left-full z-10 hidden h-full pl-8 md:block">
        <aside className="sticky top-40 w-64">
          <Toc headings={headings} />
        </aside>
      </div>
    </div>
  )
}
