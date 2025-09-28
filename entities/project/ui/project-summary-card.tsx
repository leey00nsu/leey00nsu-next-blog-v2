import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Project } from '@/entities/project/model/types'
import { buildProjectHref } from '@/shared/config/constants'
import { formatProjectPeriod } from '@/entities/project/lib/format-project-period'

interface ProjectSummaryCardProps {
  project: Project
}

export async function ProjectSummaryCard({
  project,
}: ProjectSummaryCardProps) {
  const t = await getTranslations('about.projects')
  const inProgressLabel = t('inProgress')
  const periodLabel = t('duration')
  const techStackLabel = t('techStack')
  const ariaLabel = t('viewDetailAria', { project: project.title })

  return (
    <Link
      href={buildProjectHref(project.slug)}
      className="group block rounded-lg border border-border bg-card p-5 transition hover:border-primary/60 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      aria-label={ariaLabel}
    >
      <article className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold leading-tight">{project.title}</h3>
          <ArrowUpRight
            aria-hidden
            className="h-4 w-4 text-primary transition-transform duration-200 group-hover:translate-x-1"
          />
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {project.summary}
        </p>
        <dl className="space-y-2 text-sm">
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
                    className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium"
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
