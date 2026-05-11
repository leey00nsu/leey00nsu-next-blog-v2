import { Post } from '@/entities/post/model/types'

import { MdxRenderer } from '@/features/mdx/ui/mdx-renderer'
import { getTableOfContents } from '@/shared/lib/toc'
import {
  SITE,
  SupportedLocale,
  buildBlogOgImagePath,
  buildBlogPostHref,
} from '@/shared/config/constants'
import { removePublic } from '@/shared/lib/remove-public'
import { getSiteUrl } from '@/shared/config/site-url'
import { PostDetailView } from '@/widgets/post/ui/post-detail-view'

interface PostDetailProps {
  post: Post
  locale: SupportedLocale
}

export function PostDetail({ post, locale }: PostDetailProps) {
  const headings = getTableOfContents(post.content)
  const siteUrl = getSiteUrl()
  const postUrl = new URL(buildBlogPostHref(post.slug, locale), siteUrl).toString()
  const postImagePath = post.thumbnail
    ? removePublic(post.thumbnail)
    : buildBlogOgImagePath(post.slug, locale)
  const postImageUrl = new URL(postImagePath, siteUrl).toString()

  const jsonLdData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    url: postUrl,
    mainEntityOfPage: postUrl,
    image: [postImageUrl],
    datePublished: post.date.toISOString(),
    dateModified: post.date.toISOString(),
    author: {
      '@type': 'Person',
      name: post.writer,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE.NAME,
    },
    keywords: post.tags.join(', '),
  }

  return (
    <PostDetailView
      post={post}
      locale={locale}
      headings={headings}
      jsonLdData={jsonLdData}
    >
      <MdxRenderer content={post.content} />
    </PostDetailView>
  )
}
