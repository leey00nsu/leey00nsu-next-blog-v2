'use client'

import { Post } from '@/entities/post/model/types'
import { PostCard } from '@/entities/post/ui/post-card'

import { Separator } from '@/shared/ui/separator'

interface PostListProps {
  posts: Post[]
}

export function PostList({ posts }: PostListProps) {
  return (
    <div>
      {posts.map((post) => (
        <div key={post.id}>
          <PostCard post={post} />
          <Separator />
        </div>
      ))}
    </div>
  )
}
