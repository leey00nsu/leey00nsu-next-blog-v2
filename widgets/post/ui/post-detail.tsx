import { Post } from '@/entities/post/model/types'

import { MdxRenderer } from '@/features/mdx/ui/mdx-renderer'
import { getTableOfContents } from '@/shared/lib/toc'
import { Toc } from '@/features/post/ui/toc'
import { TocRegister } from '@/features/post/ui/toc-register'
import { GiscusComments } from '@/features/post/ui/giscus-comments'
import { TagList } from '@/features/post/ui/tag-list'
import { ShareButton } from '@/features/post/ui/share-button'
import {
  SITE,
  SupportedLocale,
  buildBlogOgImagePath,
  buildBlogTagHref,
  buildBlogPostHref,
} from '@/shared/config/constants'
import { JsonLd } from '@/shared/ui/json-ld'
import { removePublic } from '@/shared/lib/remove-public'
import { getSiteUrl } from '@/shared/config/site-url'

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
    <div className="relative">
      <JsonLd data={jsonLdData} />
      <TocRegister headings={headings} />
      <article className="prose prose-lg dark:prose-invert mx-auto">
        <div className="flex items-center gap-2">
          <span>{post.date.toLocaleDateString('ko-KR')}</span>
          <span>{post.writer}</span>
        </div>
        <h1>{post.title}</h1>
        <div className="my-4 flex justify-center gap-2">
          <ShareButton />
        </div>
        <TagList
          tags={post.tags}
          hrefBuilder={(tag) => buildBlogTagHref(tag, locale)}
        />
        <hr />
        <Toc headings={headings} className="md:hidden" />
        <MdxRenderer content={post.content} />
      </article>

      <section className="mx-auto py-8">
        <GiscusComments />
      </section>
    </div>
  )
}
