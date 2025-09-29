import { notFound } from 'next/navigation'
import { getAbout } from '@/entities/about/lib/about'
import { getAllProjects } from '@/entities/project/lib/project'
import { AboutDetail } from '@/widgets/about/ui/about-detail'
import { ProjectDetail } from '@/widgets/project/ui/project-detail'
import { LOCALES, SupportedLocale } from '@/shared/config/constants'

interface ResumePrintPageProps {
  searchParams: Promise<{ locale?: string }>
}

function resolveLocale(localeParam: string | undefined): SupportedLocale {
  if (!localeParam) return LOCALES.DEFAULT
  const normalized = localeParam.toLowerCase()
  return LOCALES.SUPPORTED.includes(normalized as SupportedLocale)
    ? (normalized as SupportedLocale)
    : LOCALES.DEFAULT
}

export default async function ResumePrintPage({
  searchParams,
}: ResumePrintPageProps) {
  const params = await searchParams
  const locale = resolveLocale(params?.locale)

  const about = getAbout(locale)
  if (!about) {
    notFound()
  }

  const projects = await getAllProjects(locale)

  return (
    <div className="mx-auto max-w-3xl space-y-12 bg-white p-6 text-black">
      <AboutDetail about={about} locale={locale} showDownloadButton={false} />

      {projects.map((project) => (
        <div
          key={project.slug}
          style={{ breakBefore: 'page' }}
          className="pt-10"
        >
          <ProjectDetail locale={locale} project={project} />
        </div>
      ))}
    </div>
  )
}
