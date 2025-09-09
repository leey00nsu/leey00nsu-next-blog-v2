import type { Metadata } from 'next'
import { getAllPosts } from '@/entities/post/lib/post'
import { PostList } from '@/widgets/post/ui/post-list'
import { TagFilterBar } from '@/features/post/ui/tag-filter-bar'
import {
  filterPostsByTags,
  parseSelectedTags,
} from '@/features/post/lib/tag-utils'

interface BlogPageProps {
  // Next may pass searchParams as a Promise
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = (await searchParams) ?? {}
  const selectedTags = parseSelectedTags(params)

  const allPosts = await getAllPosts()

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
  title: '블로그',
  description: 'leey00nsu 블로그',
  openGraph: {
    title: '블로그',
    siteName: 'leey00nsu 블로그',
    images: ['/blog/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title: '블로그',
    images: ['/blog/opengraph-image'],
  },
}
