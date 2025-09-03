import { getAllPosts } from '@/entities/post/lib/post'
import { PostList } from '@/widgets/post/ui/post-list'

export default async function BlogPage() {
  const postsMeta = await getAllPosts()

  return <PostList posts={postsMeta} />
}
