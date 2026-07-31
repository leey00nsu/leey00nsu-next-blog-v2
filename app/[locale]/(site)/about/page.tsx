import type { Metadata } from 'next'
import { getAbout } from '@/entities/about/lib/about'
import { AboutDetail } from '@/widgets/about/ui/about-detail'
import { ComingSoon } from '@/shared/ui/coming-soon'
import { ENGAGEMENT } from '@/features/engagement/config/constants'
import { EngagementPageView } from '@/features/engagement/ui/engagement-page-view'
import {
  LOCALES,
  ROUTES,
  SITE,
  SupportedLocale,
  buildLocalizedRoutePath,
} from '@/shared/config/constants'

interface AboutPageProps {
  params: Promise<{ locale: SupportedLocale }>
}

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

export async function generateMetadata({
  params,
}: AboutPageProps): Promise<Metadata> {
  const { locale } = await params
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

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params
  const about = getAbout(locale)

  if (!about) {
    return (
      <article className="prose prose-lg dark:prose-invert mx-auto">
        <ComingSoon />
      </article>
    )
  }

  return (
    <>
      <EngagementPageView
        eventName={ENGAGEMENT.EVENT_NAME.ABOUT_VIEW}
        locale={locale}
      />
      <AboutDetail about={about} locale={locale} />
    </>
  )
}
