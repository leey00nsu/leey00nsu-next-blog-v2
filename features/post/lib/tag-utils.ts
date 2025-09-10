import { Post } from '@/entities/post/model/types'
import { DEFAULT_TAG_QUERY_KEY } from '@/shared/config/constants'

export function getTagCounts(posts: Post[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const post of posts) {
    for (const t of post.tags) {
      counts[t] = (counts[t] ?? 0) + 1
    }
  }
  return counts
}

export function parseSelectedTags(
  params?: Record<string, string | string[] | undefined>,
): string[] {
  if (!params) return []
  const raw = params[DEFAULT_TAG_QUERY_KEY]
  if (Array.isArray(raw))
    return raw.filter((t): t is string => typeof t === 'string')
  return raw ? [raw] : []
}

export function makeToggleHref(
  basePath: string,
  selectedTags: string[],
): (tag: string) => string {
  return (tag: string) => {
    const set = new Set(selectedTags)
    if (set.has(tag)) set.delete(tag)
    else set.add(tag)

    if (set.size === 0) return basePath
    const sp = new URLSearchParams()
    for (const t of set) sp.append(DEFAULT_TAG_QUERY_KEY, t)
    return `${basePath}?${sp.toString()}`
  }
}

export function filterPostsByTags(posts: Post[], tags: string[]): Post[] {
  if (tags.length === 0) return posts
  return posts.filter((p) => p.tags.some((t) => tags.includes(t)))
}
