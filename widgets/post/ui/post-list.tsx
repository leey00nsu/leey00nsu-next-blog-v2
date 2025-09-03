import { Post } from '@/entities/post/model/types'
import { PostCard } from '@/entities/post/ui/post-card'

import Link from 'next/link'

interface PostListProps {
  posts: Post[]
}

export function PostList({ posts }: PostListProps) {
  return (
    <div className="flex flex-col divide-y">
      {posts.map((post) => {
        return (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="hover:bg-muted/50 -mx-2 block rounded-lg transition-colors"
          >
            <PostCard post={post} />
          </Link>
        )
      })}
    </div>
  )
}
