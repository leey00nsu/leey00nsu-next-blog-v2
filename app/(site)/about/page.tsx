import type { Metadata } from 'next'
import { getAbout } from '@/entities/about/lib/about'
import { AboutDetail } from '@/widgets/about/ui/about-detail'
import { ComingSoon } from '@/shared/ui/coming-soon'
import { getLocale } from 'next-intl/server'
import { SITE, SupportedLocale } from '@/shared/config/constants'

export const metadata: Metadata = {
  title: '소개',
  description: `${SITE.NAME} - 개발자 소개 페이지`,
  openGraph: {
    title: '소개',
    siteName: SITE.NAME,
    description: `${SITE.NAME} - 개발자 소개 페이지`,
  },
}

export default async function AboutPage() {
  const locale = (await getLocale()) as SupportedLocale
  const about = getAbout(locale)

  if (!about) {
    return (
      <article className="prose prose-lg dark:prose-invert mx-auto">
        <ComingSoon />
      </article>
    )
  }

  return <AboutDetail about={about} locale={locale} />
}
