import { notFound } from 'next/navigation'
import { getAllPosts, getPostBySlug } from '@/entities/post/lib/post'
import { PostDetail } from '@/widgets/post/ui/post-detail'

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

  return <PostDetail post={post} />
}
