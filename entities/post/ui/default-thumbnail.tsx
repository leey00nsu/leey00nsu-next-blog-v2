import { Post } from '@/entities/post/model/types'
import { cn } from '@/shared/lib/utils'

interface DefaultThumbnailProps {
  post: Post
  className?: string
}

export function DefaultThumbnail({ post, className }: DefaultThumbnailProps) {
  return (
    <div
      className={cn(
        'bg-muted flex h-full w-full items-center justify-center p-8',
        className,
      )}
    >
      <span className="font-bold">{post.title}</span>
    </div>
  )
}
