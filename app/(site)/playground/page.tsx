import { Playground } from '@/widgets/studio/ui/playground'
import { redirect } from 'next/navigation'
import { getAllPosts } from '@/entities/post/lib/post'
import { getLocale } from 'next-intl/server'
import { SupportedLocale } from '@/shared/config/constants'

export default async function PlaygroundPage() {
  // 개발 환경에서만 접근 가능
  if (process.env.NODE_ENV !== 'development') {
    redirect('/')
  }

  const locale = (await getLocale()) as SupportedLocale
  const posts = await getAllPosts(locale)
  const existingSlugs = posts.map((p) => p.slug)
  const existingTags = [...new Set(posts.flatMap((p) => p.tags))]

  return (
    <Playground existingSlugs={existingSlugs} existingTags={existingTags} />
  )
}
