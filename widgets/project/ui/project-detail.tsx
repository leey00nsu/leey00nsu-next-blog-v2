import { getTranslations } from 'next-intl/server'
import { Project } from '@/entities/project/model/types'
import { formatProjectPeriod } from '@/entities/project/lib/format-project-period'
import { CustomImage } from '@/shared/ui/custom-image'
import { removePublic } from '@/shared/lib/remove-public'
import { MdxRenderer } from '@/features/mdx/ui/mdx-renderer'
import { SupportedLocale } from '@/shared/config/constants'

interface ProjectDetailProps {
  project: Project
  locale: SupportedLocale
}

export async function ProjectDetail({ project, locale }: ProjectDetailProps) {
  const t = await getTranslations({
    locale,
    namespace: 'about.projects',
  })
  const inProgressLabel = t('inProgress')
  const periodLabel = t('duration')
  const techStackLabel = t('techStack')
  const typeLabel = t('type.label')
  const projectTypeLabel = t(`type.${project.type}`)

  const formattedPeriod = formatProjectPeriod(project.period, inProgressLabel)
  const hasThumbnail = Boolean(project.thumbnail)
  const hasDimensions = project.width > 0 && project.height > 0

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl leading-tight font-bold sm:text-4xl">
            {project.title}
          </h1>
          <span className="border-border bg-muted inline-flex rounded-full border px-3 py-1 text-xs font-semibold">
            <span className="sr-only">{typeLabel}</span>
            {projectTypeLabel}
          </span>
        </div>
        <p className="text-muted-foreground text-base leading-relaxed">
          {project.summary}
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="border-border bg-card rounded-lg border p-4">
          <h2 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
            {periodLabel}
          </h2>
          <p className="mt-2 text-lg font-medium">{formattedPeriod}</p>
        </div>
        <div className="border-border bg-card rounded-lg border p-4">
          <h2 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
            {techStackLabel}
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {project.techStacks.map((stack) => (
              <li
                key={stack}
                className="border-border bg-muted rounded-full border px-3 py-1 text-xs font-medium"
              >
                {stack}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {hasThumbnail ? (
        <figure className="not-prose overflow-hidden rounded-xl">
          <CustomImage
            src={removePublic(project.thumbnail!)}
            alt={project.title}
            className="w-full object-contain"
            width={hasDimensions ? project.width : undefined}
            height={hasDimensions ? project.height : undefined}
            priority
          />
        </figure>
      ) : null}

      <article className="prose prose-lg dark:prose-invert mx-auto">
        <MdxRenderer content={project.content} />
      </article>
    </div>
  )
}
