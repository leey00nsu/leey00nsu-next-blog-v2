import type { Metadata } from 'next'
import { getAllPostSummaries } from '@/entities/post/lib/post'
import { FilterablePostList } from '@/widgets/post/ui/filterable-post-list'
import {
  LOCALES,
  ROUTES,
  SITE,
  SupportedLocale,
  buildLocalizedRoutePath,
} from '@/shared/config/constants'

interface BlogPageProps {
  params: Promise<{ locale: SupportedLocale }>
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
  params,
}: BlogPageProps): Promise<Metadata> {
  const { locale } = await params
  const metadataByLocale = BLOG_LIST_METADATA[locale]
  const localizedBlogPath = buildLocalizedRoutePath(ROUTES.BLOG, locale)

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
  }
}

export default async function BlogPage({ params }: BlogPageProps) {
  const { locale } = await params
  const allPosts = await getAllPostSummaries(locale)

  return <FilterablePostList posts={allPosts} locale={locale} />
}
