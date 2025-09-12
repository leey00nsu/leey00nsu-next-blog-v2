import { Studio } from '@/widgets/studio/ui/studio'
import { getAllPosts } from '@/entities/post/lib/post'
import { getLocale } from 'next-intl/server'
import { SupportedLocale } from '@/shared/config/constants'

export default async function StudioPage() {
  const locale = (await getLocale()) as SupportedLocale
  const posts = await getAllPosts(locale)
  const existingSlugs = posts.map((p) => p.slug)
  const existingTags = [...new Set(posts.flatMap((p) => p.tags))]

  return <Studio existingSlugs={existingSlugs} existingTags={existingTags} />
}
