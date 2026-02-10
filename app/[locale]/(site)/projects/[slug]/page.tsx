import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  getAllProjects,
  getProjectBySlug,
} from '@/entities/project/lib/project'
import { ProjectDetail } from '@/widgets/project/ui/project-detail'
import {
  LOCALES,
  buildProjectHref,
  buildProjectOgImagePath,
  SITE,
  SupportedLocale,
} from '@/shared/config/constants'
import { getLocale } from 'next-intl/server'
import { removePublic } from '@/shared/lib/remove-public'

interface ProjectPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const projects = await getAllProjects()
  return projects.map((project) => ({ slug: project.slug }))
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params
  const locale = (await getLocale()) as SupportedLocale
  const project = await getProjectBySlug(slug, locale)

  if (!project) {
    return {
      title: SITE.NAME,
      description: SITE.DEFAULT_DESCRIPTION,
    }
  }

  const canonicalUrl = buildProjectHref(slug, locale)
  const ogImage = project.thumbnail
    ? removePublic(project.thumbnail)
    : buildProjectOgImagePath(slug, locale)

  return {
    title: project.title,
    description: project.summary ?? SITE.DEFAULT_DESCRIPTION,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        ko: buildProjectHref(slug, 'ko'),
        en: buildProjectHref(slug, 'en'),
        'x-default': buildProjectHref(slug, LOCALES.DEFAULT),
      },
    },
    openGraph: {
      type: 'article',
      siteName: SITE.NAME,
      title: project.title,
      description: project.summary ?? SITE.DEFAULT_DESCRIPTION,
      url: canonicalUrl,
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: project.title,
      description: project.summary ?? SITE.DEFAULT_DESCRIPTION,
      images: [ogImage],
    },
  }
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params
  const locale = (await getLocale()) as SupportedLocale
  const project = await getProjectBySlug(slug, locale)

  if (!project) {
    notFound()
  }

  return <ProjectDetail project={project} locale={locale} />
}
