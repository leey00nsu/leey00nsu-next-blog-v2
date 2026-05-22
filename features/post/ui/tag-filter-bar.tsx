'use client'

import type { PostSummary } from '@/entities/post/model/types'
import { ExpandableTagFilterList } from '@/features/post/ui/expandable-tag-filter-list'
import {
  comparePostTags,
  getTagCounts,
} from '@/features/post/lib/tag-utils'
import { ROUTES } from '@/shared/config/constants'
import type { Route } from 'next'

interface TagFilterBarProps {
  posts: PostSummary[]
  selectedTags: string[]
  basePath?: Route
  className?: string
}

export function TagFilterBar({
  posts,
  selectedTags,
  basePath = ROUTES.BLOG,
  className,
}: TagFilterBarProps) {
  const counts = getTagCounts(posts)
  const allTags = Object.keys(counts).sort(comparePostTags)

  return (
    <ExpandableTagFilterList
      basePath={basePath}
      tags={allTags}
      counts={counts}
      selectedTags={selectedTags}
      className={className}
    />
  )
}
