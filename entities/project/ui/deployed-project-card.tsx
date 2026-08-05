import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ExternalLink } from 'lucide-react'
import type { DeployedProject } from '@/entities/project/model/types'
import { PROJECT_SUMMARY_CARD } from '@/entities/project/config/constants'
import { CustomImage } from '@/shared/ui/custom-image'
import { removePublic } from '@/shared/lib/remove-public'
import {
  buildProjectHref,
  type SupportedLocale,
} from '@/shared/config/constants'

export interface DeployedProjectCardLabels {
  category: string
  primaryAction: string
  primaryActionAriaLabel: string
  detailAction: string
  detailActionAriaLabel: string
  githubAction: string
  githubActionAriaLabel: string
  coverImageAlt: string
  techStackAriaLabel: string
}

interface DeployedProjectCardProps {
  project: DeployedProject
  locale: SupportedLocale
  labels: DeployedProjectCardLabels
}

export function DeployedProjectCard({
  project,
  locale,
  labels,
}: DeployedProjectCardProps) {
  const visibleTechStacks = project.techStacks.slice(
    0,
    PROJECT_SUMMARY_CARD.MAX_VISIBLE_TECH_STACK_COUNT,
  )
  const projectDetailHref = buildProjectHref(project.slug, locale)

  return (
    <article className="group border-border bg-card flex h-full flex-col overflow-hidden rounded-xl border">
      <Link
        href={projectDetailHref}
        aria-label={labels.detailActionAriaLabel}
        className="bg-muted relative block aspect-video overflow-hidden border-b"
      >
        <CustomImage
          fill
          src={removePublic(project.deployment.coverImage)}
          alt={labels.coverImageAlt}
          className="h-full"
          imageClassName="object-cover transition-all duration-200 group-hover:scale-110"
          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
        />
      </Link>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <p className="text-muted-foreground text-xs font-medium">
          {labels.category}
        </p>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">
            <Link
              href={projectDetailHref}
              className="hover:text-primary transition-colors"
            >
              {project.title}
            </Link>
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {project.summary}
          </p>
        </div>

        <ul
          className="mt-auto flex flex-wrap gap-2"
          aria-label={labels.techStackAriaLabel}
        >
          {visibleTechStacks.map((techStack) => (
            <li
              key={techStack}
              className="border-border bg-muted rounded-full border px-2.5 py-1 text-xs font-medium"
            >
              {techStack}
            </li>
          ))}
        </ul>

        <Link
          href={projectDetailHref}
          aria-label={labels.detailActionAriaLabel}
          className="text-primary inline-flex w-fit items-center gap-1 text-sm font-medium hover:underline"
        >
          {labels.detailAction}
          <ArrowRight aria-hidden className="size-4" />
        </Link>

        <div className="flex flex-wrap gap-2 pt-1">
          <a
            href={project.deployment.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={labels.primaryActionAriaLabel}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition"
          >
            {labels.primaryAction}
            <ExternalLink aria-hidden className="size-4" />
          </a>
          {project.links.github ? (
            <a
              href={project.links.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={labels.githubActionAriaLabel}
              className="border-border hover:bg-muted inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition"
            >
              <Image
                src="/github-mark.svg"
                alt=""
                aria-hidden
                width={16}
                height={16}
                className="dark:invert"
              />
              {labels.githubAction}
            </a>
          ) : null}
        </div>
      </div>
    </article>
  )
}
