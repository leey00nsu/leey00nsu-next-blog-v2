import { SupportedLocale } from '@/shared/config/constants'
import { getAllProjects } from '@/entities/project/lib/project'
import { ProjectSummaryCardView } from '@/entities/project/ui/project-summary-card'
import type {
  ProjectSummaryCardLabels,
  ProjectSummaryCardLinkVariant,
} from '@/entities/project/ui/project-summary-card'
import type { Project } from '@/entities/project/model/types'
import { getTranslations } from 'next-intl/server'

interface ProjectSectionProps {
  locale: SupportedLocale
  projectCardLinkVariant?: ProjectSummaryCardLinkVariant
}

interface ProjectSectionViewProps extends ProjectSectionProps {
  projects: Awaited<ReturnType<typeof getAllProjects>>
  title: string
  description: string
  buildProjectCardLabels: (project: Project) => ProjectSummaryCardLabels
}

export async function ProjectSection({
  locale,
  projectCardLinkVariant,
}: ProjectSectionProps) {
  const [projects, t] = await Promise.all([
    getAllProjects(locale),
    getTranslations({ locale, namespace: 'about.projects' }),
  ])

  if (projects.length === 0) {
    return null
  }

  const title = t('title')
  const description = t('description')
  const buildProjectCardLabels = (project: Project) => ({
    inProgressLabel: t('inProgress'),
    periodLabel: t('duration'),
    techStackLabel: t('techStack'),
    typeLabel: t('type.label'),
    projectTypeLabel: t(`type.${project.type}`),
    githubAriaLabel: t('viewGithubAria', { project: project.title }),
    detailAriaLabel: t('viewDetailAria', { project: project.title }),
  })

  return (
    <ProjectSectionView
      locale={locale}
      projectCardLinkVariant={projectCardLinkVariant}
      projects={projects}
      title={title}
      description={description}
      buildProjectCardLabels={buildProjectCardLabels}
    />
  )
}

export function ProjectSectionView({
  locale,
  projectCardLinkVariant,
  projects,
  title,
  description,
  buildProjectCardLabels,
}: ProjectSectionViewProps) {
  if (projects.length === 0) {
    return null
  }

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
          <ProjectSummaryCardView
            key={project.slug}
            project={project}
            locale={locale}
            linkVariant={projectCardLinkVariant}
            labels={buildProjectCardLabels(project)}
          />
        ))}
      </div>
    </section>
  )
}
