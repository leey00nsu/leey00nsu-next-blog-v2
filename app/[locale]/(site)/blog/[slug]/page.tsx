import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAllPostSummaries, getPostBySlug } from '@/entities/post/lib/post'
import { PostDetail } from '@/widgets/post/ui/post-detail'
import {
  LOCALES,
  buildBlogOgImagePath,
  buildBlogPostHref,
  SITE,
  SupportedLocale,
} from '@/shared/config/constants'

interface PostPageProps {
  params: Promise<{ locale: SupportedLocale; slug: string }>
}

export const dynamicParams = false

// 빌드 시점에 모든 포스트의 경로를 미리 생성합니다.
export async function generateStaticParams() {
  const posts = await getAllPostSummaries()
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const post = await getPostBySlug(slug, locale)

  if (!post) {
    return {
      title: '게시글을 찾을 수 없습니다',
    }
  }

  const ogImage = buildBlogOgImagePath(slug, locale)
  const canonicalUrl = buildBlogPostHref(slug, locale)

  return {
    title: post.title,
    description: post.description ?? SITE.DEFAULT_DESCRIPTION,
    keywords: post.tags,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        ko: buildBlogPostHref(slug, 'ko'),
        en: buildBlogPostHref(slug, 'en'),
        'x-default': buildBlogPostHref(slug, LOCALES.DEFAULT),
      },
    },
    openGraph: {
      type: 'article',
      siteName: SITE.NAME,
      title: post.title,
      description: post.description ?? SITE.DEFAULT_DESCRIPTION,
      url: canonicalUrl,
      images: [ogImage],
      publishedTime: post.date.toISOString(),
      authors: [post.writer],
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description ?? SITE.DEFAULT_DESCRIPTION,
      images: [ogImage],
    },
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const { locale, slug } = await params
  const post = await getPostBySlug(slug, locale)

  if (!post) {
    notFound()
  }

  return <PostDetail post={post} locale={locale} />
}
