import Image from 'next/image'
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
        'flex h-full w-full flex-col items-center justify-center gap-2 bg-white p-4',
        className,
      )}
    >
      <Image
        src="/logo.png"
        alt="logo"
        width={80}
        height={80}
        className="h-auto w-1/4 max-w-[80px]"
      />
      <span className="line-clamp-2 text-center text-sm font-bold text-slate-900 break-keep">
        {post.title}
      </span>
      {post.description && (
        <span className="line-clamp-2 text-center text-xs text-slate-600 break-keep">
          {post.description}
        </span>
      )}
    </div>
  )
}
