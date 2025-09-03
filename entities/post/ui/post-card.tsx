import { Post } from '@/entities/post/model/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'

interface PostCardProps {
  post: Post
}

export function PostCard({ post }: PostCardProps) {
  return (
    <div className="flex items-center gap-2 px-2 py-4 text-left text-sm">
      <Avatar className="h-8 w-8 self-baseline rounded-lg">
        <AvatarImage src={post.image} alt={post.title} />
        <AvatarFallback className="rounded-lg">CN</AvatarFallback>
      </Avatar>
      <div className="flex flex-1 flex-col gap-2 text-left text-sm">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{post.title}</span>
          <span className="text-muted-foreground text-xs font-light">
            {post.date.toLocaleDateString('ko-KR')}
          </span>
        </div>
        <span className="text-muted-foreground line-clamp-3 text-xs">
          {post.description}
        </span>
      </div>
    </div>
  )
}
