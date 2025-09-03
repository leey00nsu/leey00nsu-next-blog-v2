import { getAllPosts } from '@/lib/post'
import { PostCard } from '@/entities/post/ui/post-card'
import Link from 'next/link'
import { Post } from '@/entities/post/model/types'

export default async function BlogPage() {
  const postsMeta = await getAllPosts()

  return (
    <div className="py-8">
      <h1 className="mb-8 text-3xl font-bold">Blog</h1>
      <div className="flex flex-col divide-y">
        {postsMeta.map((meta) => {
          const cardPost: Post = {
            ...meta,
            image: '',
            content: meta.description,
            date: meta.date.toLocaleDateString('ko-KR'),
            id: meta.slug,
            writer: '',
          }

          return (
            <Link
              key={meta.slug}
              href={`/blog/${meta.slug}`}
              className="hover:bg-muted/50 -mx-2 block rounded-lg transition-colors"
            >
              <PostCard post={cardPost} />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
