import { Studio } from '@/widgets/studio/ui/studio'
import { getAllPosts } from '@/entities/post/lib/post'
import { Suspense } from 'react'

export default async function StudioPage() {
  const posts = await getAllPosts()
  const existingSlugs = posts.map((p) => p.slug)
  const existingTags = [...new Set(posts.flatMap((p) => p.tags))]

  return (
    <Suspense fallback={<p>loading...</p>}>
      <Studio existingSlugs={existingSlugs} existingTags={existingTags} />
    </Suspense>
  )
}
