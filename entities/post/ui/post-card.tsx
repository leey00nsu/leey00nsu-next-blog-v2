import { Post } from '@/entities/post/model/types'
import { DefaultThumbnail } from '@/entities/post/ui/default-thumbnail'
import CustomImage from '@/features/post/ui/custom-image'
import removePublic from '@/lib/remove-public'

interface PostCardProps {
  post: Post
}

export function PostCard({ post }: PostCardProps) {
  return (
    <div className="group hover:bg-muted/50 grid grid-cols-2 items-center gap-2 rounded-lg px-2 py-4 text-left text-sm transition-colors">
      <div className="flex flex-col gap-2 text-left">
        <span className="flex items-center gap-2 text-lg font-medium">
          {post.title}
        </span>
        <span className="text-muted-foreground line-clamp-3 text-sm">
          {post.description}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs font-light">
            {post.date.toLocaleDateString('ko-KR')}
          </span>
          <span>{'·'}</span>
          <span className="text-muted-foreground text-xs font-light">
            {post.writer}
          </span>
        </div>
      </div>

      <div className="relative h-40 w-40 justify-self-end overflow-hidden rounded-2xl">
        {post.thumbnail ? (
          <CustomImage
            src={removePublic(post.thumbnail)}
            alt={post.title}
            width={post.width}
            height={post.height}
            base64={post.blurDataURL}
            className="h-full w-full object-cover object-center transition-all duration-200 group-hover:scale-110"
          />
        ) : (
          <DefaultThumbnail
            post={post}
            className="object-cover transition-all duration-200 group-hover:scale-110"
          />
        )}
      </div>
    </div>
  )
}
