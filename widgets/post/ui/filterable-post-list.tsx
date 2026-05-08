'use client'

import { useSearchParams } from 'next/navigation'
import { Post } from '@/entities/post/model/types'
import { TagFilterBar } from '@/features/post/ui/tag-filter-bar'
import {
  filterPostsByTags,
  parseSelectedTags,
} from '@/features/post/lib/tag-utils'
import {
  ROUTES,
  SupportedLocale,
  buildLocalizedRoutePath,
} from '@/shared/config/constants'
import { PostList } from '@/widgets/post/ui/post-list'

interface FilterablePostListProps {
  posts: Post[]
  locale: SupportedLocale
}

function toSearchParamRecord(
  searchParams: ReturnType<typeof useSearchParams>,
): Record<string, string | string[]> {
  const searchParamRecord: Record<string, string | string[]> = {}

  for (const [key, value] of searchParams.entries()) {
    const currentValue = searchParamRecord[key]

    if (Array.isArray(currentValue)) {
      searchParamRecord[key] = [...currentValue, value]
      continue
    }

    if (typeof currentValue === 'string') {
      searchParamRecord[key] = [currentValue, value]
      continue
    }

    searchParamRecord[key] = value
  }

  return searchParamRecord
}

export function FilterablePostList({ posts, locale }: FilterablePostListProps) {
  const searchParams = useSearchParams()
  const selectedTags = parseSelectedTags(toSearchParamRecord(searchParams))
  const filteredPosts = filterPostsByTags(posts, selectedTags)

  return (
    <div className="flex flex-col gap-6">
      <TagFilterBar
        posts={posts}
        selectedTags={selectedTags}
        basePath={buildLocalizedRoutePath(ROUTES.BLOG, locale)}
        className="mb-2"
      />
      <PostList posts={filteredPosts} locale={locale} />
    </div>
  )
}
