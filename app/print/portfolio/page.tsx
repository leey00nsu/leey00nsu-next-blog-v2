import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { getAbout } from '@/entities/about/lib/about'
import { getAllProjects } from '@/entities/project/lib/project'
import { PortfolioPrintCover } from '@/widgets/about/ui/portfolio-print-cover'
import { ProjectPrintDetail } from '@/widgets/project/ui/project-print-detail'
import { determineSupportedLocale } from '@/shared/lib/locale/determine-supported-locale'

export default async function PortfolioPrintPage() {
  const store = await cookies()
  const localeCookie = store.get('locale')?.value ?? null
  const locale = determineSupportedLocale([localeCookie])

  const about = getAbout(locale)
  if (!about) {
    notFound()
  }

  const projects = await getAllProjects(locale)

  return (
    <div className="portfolio-print-root space-y-12 bg-white px-0.5 text-black">
      <PortfolioPrintCover about={about} locale={locale} />

      {projects.map((project) => (
        <div
          key={project.slug}
          style={{ breakBefore: 'page' }}
          className="pt-10"
        >
          <ProjectPrintDetail locale={locale} project={project} />
        </div>
      ))}
    </div>
  )
}
