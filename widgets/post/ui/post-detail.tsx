import { Post } from '@/entities/post/model/types'

import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeSlug from 'rehype-slug'
import rehypePrettyCode from 'rehype-pretty-code'
import { CustomFigcaption } from '@/features/post/ui/custom-figcaption'
import remarkRemovePublic from '@/lib/remark-remove-public'
import CustomImage from '@/features/post/ui/custom-image'
import imageMetadata from '@/lib/image-metadata'
import { getTableOfContents } from '@/lib/toc'
import { Toc } from '@/features/post/ui/toc'
import GiscusComments from '@/features/post/ui/giscus-comments'

interface PostDetailProps {
  post: Post
}

export function PostDetail({ post }: PostDetailProps) {
  const headings = getTableOfContents(post.content)

  return (
    <div className="relative">
      <article className="prose prose-lg dark:prose-invert mx-auto py-8">
        <time dateTime={post.date.toISOString()}>
          {post.date.toLocaleDateString('ko-KR')}
        </time>
        <h1 className="mt-2">{post.title}</h1>
        <hr />
        <Toc headings={headings} className="md:hidden" />
        <MDXRemote
          source={post.content}
          components={{
            figcaption: CustomFigcaption,
            img: CustomImage,
          }}
          options={{
            mdxOptions: {
              remarkPlugins: [remarkGfm, remarkBreaks, remarkRemovePublic],
              rehypePlugins: [
                [
                  rehypePrettyCode,
                  {
                    theme: 'github-dark',
                  },
                ],
                rehypeSlug,
                imageMetadata,
              ],
            },
          }}
        />
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
