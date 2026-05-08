import { Playground } from '@/widgets/studio/ui/playground'
import { redirect } from 'next/navigation'
import { getAllPosts } from '@/entities/post/lib/post'
import {
  ROUTES,
  SupportedLocale,
  buildLocalizedRoutePath,
} from '@/shared/config/constants'

interface PlaygroundPageProps {
  params: Promise<{ locale: SupportedLocale }>
}

export default async function PlaygroundPage({ params }: PlaygroundPageProps) {
  const { locale } = await params

  // 개발 환경에서만 접근 가능
  if (process.env.NODE_ENV !== 'development') {
    redirect(buildLocalizedRoutePath(ROUTES.BLOG, locale))
  }

  const posts = await getAllPosts(locale)
  const existingSlugs = posts.map((p) => p.slug)
  const existingTags = [...new Set(posts.flatMap((p) => p.tags))]

  return (
    <Playground existingSlugs={existingSlugs} existingTags={existingTags} />
  )
}
