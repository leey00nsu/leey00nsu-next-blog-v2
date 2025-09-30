import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Project } from '@/entities/project/model/types'
import { buildProjectHref } from '@/shared/config/constants'
import { formatProjectPeriod } from '@/entities/project/lib/format-project-period'
import { SupportedLocale } from '@/shared/config/constants'

interface ProjectSummaryCardProps {
  project: Project
  locale: SupportedLocale
}

export async function ProjectSummaryCard({
  project,
  locale,
}: ProjectSummaryCardProps) {
  const t = await getTranslations({ locale, namespace: 'about.projects' })
  const inProgressLabel = t('inProgress')
  const periodLabel = t('duration')
  const techStackLabel = t('techStack')
  const typeLabel = t('type.label')
  const projectTypeLabel = t(`type.${project.type}`)
  const ariaLabel = t('viewDetailAria', { project: project.title })

  return (
    <Link
      href={buildProjectHref(project.slug)}
      className="group border-border bg-card hover:border-primary/60 focus-visible:ring-primary/60 block rounded-lg border p-5 transition hover:shadow-sm focus-visible:ring-2 focus-visible:outline-none"
      aria-label={ariaLabel}
    >
      <article className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg leading-tight font-semibold">
            {project.title}
          </h3>
          <ArrowUpRight
            aria-hidden
            className="text-primary h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
          />
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {project.summary}
        </p>
        <dl className="space-y-2 text-sm">
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">{typeLabel}</dt>
            <dd>
              <span className="border-border bg-muted inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide">
                {projectTypeLabel}
              </span>
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">{periodLabel}</dt>
            <dd className="font-medium">
              {formatProjectPeriod(project.period, inProgressLabel)}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">{techStackLabel}</dt>
            <dd>
              <ul className="flex flex-wrap gap-2">
                {project.techStacks.map((stack) => (
                  <li
                    key={stack}
                    className="border-border bg-muted rounded-full border px-2.5 py-1 text-xs font-medium"
                  >
                    {stack}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>
      </article>
    </Link>
  )
}
