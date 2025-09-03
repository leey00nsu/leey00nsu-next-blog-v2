import { notFound } from 'next/navigation'
import { getAllPosts, getPostBySlug } from '@/lib/post'
import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkRemovePublic from '@/lib/remark-remove-public'
import rehypeSlug from 'rehype-slug'
import rehypePrettyCode from 'rehype-pretty-code'
import CustomSnipet from '@/entities/post/ui/custom-snippet'

interface PostPageProps {
  params: {
    slug: string
  }
}

// 빌드 시점에 모든 포스트의 경로를 미리 생성합니다.
export async function generateStaticParams() {
  const posts = await getAllPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params

  const post = await getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  return (
    <article className="prose prose-lg dark:prose-invert mx-auto py-8">
      <time dateTime={post.date.toISOString()}>
        {post.date.toLocaleDateString('ko-KR')}
      </time>
      <h1 className="mt-2">{post.title}</h1>
      <p className="lead">{post.description}</p>
      <hr />
      <MDXRemote
        source={post.content}
        components={{
          figcaption: CustomSnipet,
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
            ],
          },
        }}
      />
    </article>
  )
}
