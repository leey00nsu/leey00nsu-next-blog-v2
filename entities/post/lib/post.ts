import { cache } from 'react'
import { Post, PostMetaDataSchema } from '@/entities/post/model/types'
import { LOCALES, type SupportedLocale } from '@/shared/config/constants'
import { GENERATED_POSTS } from '@/entities/post/config/posts.generated'
import type {
  GeneratedPostSerialized,
  GeneratedPostsMap,
} from '@/entities/post/model/types'

const DEFAULT_LOCALE = LOCALES.DEFAULT

const GENERATED_POSTS_MAP: GeneratedPostsMap = GENERATED_POSTS

function resolveGeneratedPost(
  slug: string,
  locale: SupportedLocale,
): GeneratedPostSerialized | undefined {
  const localeEntries = GENERATED_POSTS_MAP[locale]
  const fallbackEntries = GENERATED_POSTS_MAP[DEFAULT_LOCALE]
  return localeEntries?.[slug] ?? fallbackEntries?.[slug]
}

function hydratePost(record: GeneratedPostSerialized | undefined): Post | null {
  if (!record) return null

  const { date, content, width, height, blurDataURL, ...rest } = record

  try {
    const frontmatter = PostMetaDataSchema.parse({
      ...rest,
      date: new Date(date),
      blurDataURL: blurDataURL || undefined,
    })

    return {
      ...frontmatter,
      content,
      width,
      height,
      blurDataURL: blurDataURL || undefined,
    }
  } catch (error) {
    console.error(`Error hydrating post for slug ${rest.slug}:`, error)
    return null
  }
}

export const getPostBySlug = async (
  slug: string,
  locale: SupportedLocale = DEFAULT_LOCALE,
): Promise<Post | null> => {
  const record = resolveGeneratedPost(slug, locale)
  return hydratePost(record)
}

export const getAllPosts = cache(
  async (locale: SupportedLocale = DEFAULT_LOCALE): Promise<Post[]> => {
    const localeEntries = GENERATED_POSTS_MAP[locale]
    const fallbackEntries = GENERATED_POSTS_MAP[DEFAULT_LOCALE]

    if (!localeEntries && !fallbackEntries) {
      return []
    }

    const mergedSlugs = new Set<string>([
      ...Object.keys(localeEntries ?? {}),
      ...Object.keys(fallbackEntries ?? {}),
    ])

    const posts: Post[] = []

    for (const slug of mergedSlugs) {
      const record = resolveGeneratedPost(slug, locale)
      const post = hydratePost(record)
      if (!post || post.draft) continue
      posts.push(post)
    }

    return posts.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
  },
)
