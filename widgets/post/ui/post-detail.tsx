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

interface PostDetailProps {
  post: Post
}

export function PostDetail({ post }: PostDetailProps) {
  return (
    <article className="prose prose-lg dark:prose-invert mx-auto py-8">
      <time dateTime={post.date.toISOString()}>
        {post.date.toLocaleDateString('ko-KR')}
      </time>
      <h1 className="mt-2">{post.title}</h1>
      <hr />
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
  )
}
