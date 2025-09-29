import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { getAbout } from '@/entities/about/lib/about'
import { getAllProjects } from '@/entities/project/lib/project'
import { AboutDetail } from '@/widgets/about/ui/about-detail'
import { ProjectDetail } from '@/widgets/project/ui/project-detail'
import { determineSupportedLocale } from '@/shared/lib/locale/determine-supported-locale'

export default async function ResumePrintPage() {
  const store = await cookies()
  const localeCookie = store.get('locale')?.value ?? null
  const locale = determineSupportedLocale([localeCookie])

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
