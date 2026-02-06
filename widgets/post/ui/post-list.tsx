import { Post } from '@/entities/post/model/types'
import { PostCard } from '@/entities/post/ui/post-card'
import {
  SupportedLocale,
  buildBlogPostHref,
} from '@/shared/config/constants'

import Link from 'next/link'

interface PostListProps {
  posts: Post[]
  locale: SupportedLocale
}

export function PostList({ posts, locale }: PostListProps) {
  return (
    <div className="flex flex-col divide-y">
      {posts.map((post, index) => {
        return (
          <Link key={post.slug} href={buildBlogPostHref(post.slug, locale)}>
            <PostCard post={post} priority={index === 0} />
          </Link>
        )
      })}
    </div>
  )
}
