import { Studio } from '@/widgets/studio/ui/studio'
import { getAllPosts } from '@/entities/post/lib/post'
import { SupportedLocale } from '@/shared/config/constants'

interface StudioEditorPageProps {
  params: Promise<{ locale: string }>
}

export const dynamic = 'force-dynamic'

export default async function StudioEditorPage({
  params,
}: StudioEditorPageProps) {
  const { locale: localeParam } = await params
  const locale = localeParam as SupportedLocale
  const posts = await getAllPosts(locale)
  const existingSlugs = posts.map((post) => post.slug)
  const existingTags = [...new Set(posts.flatMap((post) => post.tags))]

  return <Studio existingSlugs={existingSlugs} existingTags={existingTags} />
}
