import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Project } from '@/entities/project/model/types'
import { buildProjectHref } from '@/shared/config/constants'
import { formatProjectPeriod } from '@/entities/project/lib/format-project-period'
import { SupportedLocale } from '@/shared/config/constants'
import { PROJECT_SUMMARY_CARD } from '@/entities/project/config/constants'
import { CustomImage } from '@/shared/ui/custom-image'
import { removePublic } from '@/shared/lib/remove-public'

interface ProjectSummaryCardProps {
  project: Project
  locale: SupportedLocale
  linkVariant?: ProjectSummaryCardLinkVariant
}

export type ProjectSummaryCardLinkVariant = 'detail' | 'github'

export async function ProjectSummaryCard({
  project,
  locale,
  linkVariant = 'detail',
}: ProjectSummaryCardProps) {
  const t = await getTranslations({ locale, namespace: 'about.projects' })
  const inProgressLabel = t('inProgress')
  const periodLabel = t('duration')
  const techStackLabel = t('techStack')
  const typeLabel = t('type.label')
  const projectTypeLabel = t(`type.${project.type}`)
  const githubUrl = project.links.github
  const shouldLinkToGithub = linkVariant === 'github' && Boolean(githubUrl)
  const ariaLabel = shouldLinkToGithub
    ? t('viewGithubAria', { project: project.title })
    : t('viewDetailAria', { project: project.title })
  const visibleTechStacks = project.techStacks.slice(
    0,
    PROJECT_SUMMARY_CARD.MAX_VISIBLE_TECH_STACK_COUNT,
  )
  const visibleKeyFeatures = project.keyFeatures.slice(
    0,
    PROJECT_SUMMARY_CARD.MAX_VISIBLE_KEY_FEATURE_COUNT,
  )
  const hasThumbnail = Boolean(project.thumbnail)
  const hasDimensions = project.width > 0 && project.height > 0

  const className =
    'group border-border bg-card hover:border-primary/60 focus-visible:ring-primary/60 block rounded-lg border p-5 transition hover:shadow-sm focus-visible:ring-2 focus-visible:outline-none'

  const content = (
    <article className="flex items-start gap-4">
      {hasThumbnail ? (
        <span className="border-border bg-muted flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
          <CustomImage
            src={removePublic(project.thumbnail!)}
            alt=""
            aria-hidden
            className="h-full w-full object-cover"
            width={hasDimensions ? project.width : undefined}
            height={hasDimensions ? project.height : undefined}
          />
        </span>
      ) : null}

      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg leading-tight font-semibold">
            {project.title}
          </h3>
          <ArrowUpRight
            aria-hidden
            className="text-primary h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
          />
        </div>

        <p className="text-muted-foreground text-sm leading-relaxed">
          {project.summary}
        </p>

        {visibleKeyFeatures.length > 0 ? (
          <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-sm">
            {visibleKeyFeatures.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        ) : null}

        <dl className="space-y-2 text-sm">
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">{typeLabel}</dt>
            <dd>
              <span className="border-border bg-muted inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide uppercase">
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
                {visibleTechStacks.map((stack) => (
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
      </div>
    </article>
  )

  if (shouldLinkToGithub) {
    return (
      <a
        href={githubUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        aria-label={ariaLabel}
      >
        {content}
      </a>
    )
  }

  return (
    <Link
      href={buildProjectHref(project.slug)}
      className={className}
      aria-label={ariaLabel}
    >
      {content}
    </Link>
  )
}
