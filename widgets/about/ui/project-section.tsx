import { SupportedLocale } from '@/shared/config/constants'
import { getAllProjects } from '@/entities/project/lib/project'
import { ProjectSummaryCard } from '@/entities/project/ui/project-summary-card'
import { getTranslations } from 'next-intl/server'

interface ProjectSectionProps {
  locale: SupportedLocale
}

export async function ProjectSection({ locale }: ProjectSectionProps) {
  const [projects, t] = await Promise.all([
    getAllProjects(locale),
    getTranslations({ locale, namespace: 'about.projects' }),
  ])

  if (projects.length === 0) {
    return null
  }

  const title = t('title')
  const description = t('description')

  return (
    <section
      aria-labelledby="about-projects-heading"
      className="mt-12 space-y-6"
    >
      <div className="space-y-2">
        <h2 id="about-projects-heading" className="text-2xl font-semibold">
          {title}
        </h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <div className="space-y-4">
        {projects.map((project) => (
          <ProjectSummaryCard
            key={project.slug}
            project={project}
            locale={locale}
          />
        ))}
      </div>
    </section>
  )
}
