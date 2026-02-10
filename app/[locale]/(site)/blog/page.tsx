import type { Metadata } from 'next'
import { getAllPosts } from '@/entities/post/lib/post'
import { PostList } from '@/widgets/post/ui/post-list'
import { TagFilterBar } from '@/features/post/ui/tag-filter-bar'
import {
  filterPostsByTags,
  parseSelectedTags,
} from '@/features/post/lib/tag-utils'
import {
  LOCALES,
  ROUTES,
  SITE,
  SupportedLocale,
  buildLocalizedRoutePath,
} from '@/shared/config/constants'
import { getLocale } from 'next-intl/server'

interface BlogPageProps {
  // Next may pass searchParams as a Promise
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const BLOG_LIST_METADATA = {
  ko: {
    title: '블로그',
    description: '개발 경험과 회고를 정리한 글 목록입니다.',
  },
  en: {
    title: 'Blog',
    description: 'A collection of development notes and retrospectives.',
  },
} as const

export async function generateMetadata({
  searchParams,
}: BlogPageProps): Promise<Metadata> {
  const locale = (await getLocale()) as SupportedLocale
  const metadataByLocale = BLOG_LIST_METADATA[locale]
  const params = (await searchParams) ?? {}
  const selectedTags = parseSelectedTags(params)
  const localizedBlogPath = buildLocalizedRoutePath(ROUTES.BLOG, locale)
  const hasSelectedTags = selectedTags.length > 0

  return {
    title: metadataByLocale.title,
    description: metadataByLocale.description,
    alternates: {
      canonical: localizedBlogPath,
      languages: {
        ko: buildLocalizedRoutePath(ROUTES.BLOG, 'ko'),
        en: buildLocalizedRoutePath(ROUTES.BLOG, 'en'),
        'x-default': buildLocalizedRoutePath(ROUTES.BLOG, LOCALES.DEFAULT),
      },
    },
    openGraph: {
      type: 'website',
      siteName: SITE.NAME,
      title: metadataByLocale.title,
      description: metadataByLocale.description,
      url: localizedBlogPath,
      images: ['/opengraph-image'],
    },
    twitter: {
      card: 'summary_large_image',
      title: metadataByLocale.title,
      description: metadataByLocale.description,
      images: ['/opengraph-image'],
    },
    robots: hasSelectedTags
      ? {
          index: false,
          follow: true,
        }
      : undefined,
  }
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
        basePath={buildLocalizedRoutePath(ROUTES.BLOG, locale)}
        className="mb-2"
      />
      <PostList posts={posts} locale={locale} />
    </div>
  )
}
