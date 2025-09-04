import { Post } from '@/entities/post/model/types'
import TagList from '@/features/post/ui/tag-list'
import { getTagCounts, makeToggleHref } from '@/features/post/lib/tag-utils'

interface TagFilterBarProps {
  posts: Post[]
  selectedTags: string[]
  basePath?: string
  className?: string
}

export default function TagFilterBar({
  posts,
  selectedTags,
  basePath = '/blog',
  className,
}: TagFilterBarProps) {
  const counts = getTagCounts(posts)
  const allTags = Object.keys(counts).sort((a, b) => a.localeCompare(b))
  const hrefBuilder = makeToggleHref(basePath, selectedTags)

  return (
    <TagList
      tags={allTags}
      counts={counts}
      selectedTags={selectedTags}
      hrefBuilder={hrefBuilder}
      className={className}
    />
  )
}

