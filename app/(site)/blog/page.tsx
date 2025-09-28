import type { Metadata } from 'next'
import { getAllPosts } from '@/entities/post/lib/post'
import { PostList } from '@/widgets/post/ui/post-list'
import { TagFilterBar } from '@/features/post/ui/tag-filter-bar'
import {
  filterPostsByTags,
  parseSelectedTags,
} from '@/features/post/lib/tag-utils'
import { SITE } from '@/shared/config/constants'
import { getLocale } from 'next-intl/server'
import { SupportedLocale } from '@/shared/config/constants'

interface BlogPageProps {
  // Next may pass searchParams as a Promise
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = (await searchParams) ?? {}
  const selectedTags = parseSelectedTags(params)

  const locale = (await getLocale()) as SupportedLocale
  const allPosts = await getAllPosts(locale)

  const posts = filterPostsByTags(allPosts, selectedTags)

  return (
    <div className="flex flex-col gap-6">
      <TagFilterBar
        posts={allPosts}
        selectedTags={selectedTags}
        className="mb-2"
      />
      <PostList posts={posts} />
    </div>
  )
}

export const metadata: Metadata = {
  title: SITE.NAME,
  description: SITE.DEFAULT_DESCRIPTION,
  openGraph: {
    title: SITE.NAME,
    siteName: SITE.NAME,
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE.NAME,
    images: ['/opengraph-image'],
  },
}
