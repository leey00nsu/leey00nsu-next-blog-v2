import type { Metadata } from 'next'
import { getAbout } from '@/entities/about/lib/about'
import { AboutDetail } from '@/widgets/about/ui/about-detail'
import { ComingSoon } from '@/shared/ui/coming-soon'
import { getLocale } from 'next-intl/server'
import {
  LOCALES,
  ROUTES,
  SITE,
  SupportedLocale,
  buildLocalizedRoutePath,
} from '@/shared/config/constants'

const ABOUT_METADATA_FALLBACK = {
  ko: {
    title: '소개',
    description: `${SITE.NAME} - 개발자 소개 페이지`,
  },
  en: {
    title: 'About',
    description: `${SITE.NAME} - About page`,
  },
} as const

function getAboutMetadata(locale: SupportedLocale) {
  const about = getAbout(locale)
  const fallback = ABOUT_METADATA_FALLBACK[locale]

  return {
    title: about?.title ?? fallback.title,
    description: about?.description ?? fallback.description,
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as SupportedLocale
  const aboutMetadata = getAboutMetadata(locale)
  const canonicalUrl = buildLocalizedRoutePath(ROUTES.ABOUT, locale)

  return {
    title: aboutMetadata.title,
    description: aboutMetadata.description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        ko: buildLocalizedRoutePath(ROUTES.ABOUT, 'ko'),
        en: buildLocalizedRoutePath(ROUTES.ABOUT, 'en'),
        'x-default': buildLocalizedRoutePath(ROUTES.ABOUT, LOCALES.DEFAULT),
      },
    },
    openGraph: {
      type: 'website',
      title: aboutMetadata.title,
      siteName: SITE.NAME,
      description: aboutMetadata.description,
      url: canonicalUrl,
      images: ['/opengraph-image'],
    },
    twitter: {
      card: 'summary_large_image',
      title: aboutMetadata.title,
      description: aboutMetadata.description,
      images: ['/opengraph-image'],
    },
  }
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
