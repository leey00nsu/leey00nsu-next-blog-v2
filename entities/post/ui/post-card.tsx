import { Post } from '@/entities/post/model/types'
import { DefaultThumbnail } from '@/entities/post/ui/default-thumbnail'
import removePublic from '@/lib/remove-public'
import Image from 'next/image'

interface PostCardProps {
  post: Post
}

export function PostCard({ post }: PostCardProps) {
  return (
    <div className="group hover:bg-muted/50 -mx-2 flex items-center gap-2 rounded-lg px-2 py-4 text-left text-sm transition-colors">
      <div className="flex flex-1 flex-col gap-2 text-left">
        <div className="flex items-center gap-2 text-lg">
          <span className="truncate font-medium">{post.title}</span>
        </div>
        <span className="text-muted-foreground line-clamp-3 text-sm">
          {post.description}
        </span>
        <span className="text-muted-foreground text-xs font-light">
          {post.date.toLocaleDateString('ko-KR')}
        </span>
      </div>

      <div className="relative h-40 w-40 overflow-hidden rounded-2xl">
        {post.thumbnail ? (
          <Image
            src={removePublic(post.thumbnail)}
            alt={post.title}
            fill
            className="rounded-2xl object-cover transition-all duration-200 group-hover:scale-110"
          />
        ) : (
          <DefaultThumbnail
            post={post}
            className="rounded-2xl object-cover transition-all duration-200 group-hover:scale-110"
          />
        )}
      </div>
    </div>
  )
}
