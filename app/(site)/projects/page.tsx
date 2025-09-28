import { getLocale, getTranslations } from 'next-intl/server'
import { getAllProjects } from '@/entities/project/lib/project'
import { ProjectSummaryCard } from '@/entities/project/ui/project-summary-card'
import { SupportedLocale } from '@/shared/config/constants'

export default async function ProjectsPage() {
  const locale = (await getLocale()) as SupportedLocale
  const [projects, t] = await Promise.all([
    getAllProjects(locale),
    getTranslations('project.list'),
  ])

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-6">
      <header className="space-y-3">
        <h1 className="text-3xl leading-tight font-bold sm:text-4xl">
          {t('title')}
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed">
          {t('description')}
        </p>
      </header>

      {projects.length === 0 ? (
        <p className="border-border bg-muted/40 text-muted-foreground rounded-lg border border-dashed p-6 text-center">
          {t('empty')}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <ProjectSummaryCard key={project.slug} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}
