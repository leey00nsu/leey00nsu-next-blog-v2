import { Studio } from '@/widgets/studio/ui/studio'
import { getAllPosts } from '@/entities/post/lib/post'

export default async function StudioPage() {
  const posts = await getAllPosts()
  const existingSlugs = posts.map((p) => p.slug)
  const existingTags = [...new Set(posts.flatMap((p) => p.tags))]

  return <Studio existingSlugs={existingSlugs} existingTags={existingTags} />
}
