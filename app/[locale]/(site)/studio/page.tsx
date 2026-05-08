import { Studio } from '@/widgets/studio/ui/studio'
import { getAllPosts } from '@/entities/post/lib/post'
import { SupportedLocale } from '@/shared/config/constants'

interface StudioPageProps {
  params: Promise<{ locale: string }>
}

export const dynamic = 'force-dynamic'

export default async function StudioPage({ params }: StudioPageProps) {
  const { locale: localeParam } = await params
  const locale = localeParam as SupportedLocale
  const posts = await getAllPosts(locale)
  const existingSlugs = posts.map((p) => p.slug)
  const existingTags = [...new Set(posts.flatMap((p) => p.tags))]

  return <Studio existingSlugs={existingSlugs} existingTags={existingTags} />
}
