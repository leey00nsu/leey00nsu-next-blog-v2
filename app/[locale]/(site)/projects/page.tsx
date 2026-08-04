import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { DeployedProjectList } from '@/widgets/project/ui/deployed-project-list'
import {
  LOCALES,
  ROUTES,
  SITE,
  buildLocalizedRoutePath,
  type SupportedLocale,
} from '@/shared/config/constants'

interface ProjectsPageProps {
  params: Promise<{ locale: SupportedLocale }>
}

export async function generateMetadata({
  params,
}: ProjectsPageProps): Promise<Metadata> {
  const { locale } = await params
  const translate = await getTranslations({
    locale,
    namespace: 'project.list',
  })
  const canonicalUrl = buildLocalizedRoutePath(ROUTES.PROJECTS, locale)

  return {
    title: translate('title'),
    description: translate('description'),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        ko: buildLocalizedRoutePath(ROUTES.PROJECTS, 'ko'),
        en: buildLocalizedRoutePath(ROUTES.PROJECTS, 'en'),
        'x-default': buildLocalizedRoutePath(ROUTES.PROJECTS, LOCALES.DEFAULT),
      },
    },
    openGraph: {
      type: 'website',
      siteName: SITE.NAME,
      title: translate('title'),
      description: translate('description'),
      url: canonicalUrl,
      images: ['/opengraph-image'],
    },
    twitter: {
      card: 'summary_large_image',
      title: translate('title'),
      description: translate('description'),
      images: ['/opengraph-image'],
    },
  }
}

export default async function ProjectsPage({ params }: ProjectsPageProps) {
  const { locale } = await params
  const translate = await getTranslations({
    locale,
    namespace: 'project.list',
  })

  return (
    <section className="mx-auto max-w-5xl space-y-8 py-4 md:py-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          {translate('title')}
        </h1>
        <p className="text-muted-foreground max-w-2xl leading-relaxed">
          {translate('description')}
        </p>
      </header>
      <DeployedProjectList locale={locale} />
    </section>
  )
}
