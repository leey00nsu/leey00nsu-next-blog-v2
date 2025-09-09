import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAllPosts, getPostBySlug } from '@/entities/post/lib/post'
import { PostDetail } from '@/widgets/post/ui/post-detail'

interface PostPageProps {
  params: Promise<{ slug: string }>
}

// 빌드 시점에 모든 포스트의 경로를 미리 생성합니다.
export async function generateStaticParams() {
  const posts = await getAllPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) {
    return {
      title: '게시글을 찾을 수 없습니다',
    }
  }

  const ogImage = `/blog/${slug}/opengraph-image`

  return {
    title: post.title,
    description: post.description ?? 'leey00nsu 블로그',
    openGraph: {
      type: 'article',
      siteName: 'leey00nsu 블로그',
      title: post.title,
      description: post.description ?? 'leey00nsu 블로그',
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description ?? 'leey00nsu 블로그',
      images: [ogImage],
    },
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params

  const post = await getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  return <PostDetail post={post} />
}
