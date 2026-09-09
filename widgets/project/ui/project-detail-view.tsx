import type { ReactNode } from 'react'
import type { Project } from '@/entities/project/model/types'
import { formatProjectPeriod } from '@/entities/project/lib/format-project-period'
import { removePublic } from '@/shared/lib/remove-public'
import { EntranceMotionBlock } from '@/shared/ui/entrance-motion-block'
import { CustomImage } from '@/shared/ui/custom-image'
import { cn } from '@/shared/lib/utils'

const PROJECT_DETAIL_BLOCK_ANIMATION = {
  HEADER_DELAY_SECONDS: 0,
  CONTENT_DELAY_SECONDS: 0.12,
} as const

export interface ProjectDetailLabels {
  inProgressLabel: string
  periodLabel: string
  techStackLabel: string
  typeLabel: string
  projectTypeLabel: string
}

interface ProjectDetailViewProps {
  project: Project
  labels: ProjectDetailLabels
  children?: ReactNode
  beforeContent?: ReactNode
  articleClassName?: string
  enableBlockEntranceAnimation?: boolean
}

export function ProjectDetailView({
  project,
  labels,
  children,
  beforeContent,
  articleClassName,
  enableBlockEntranceAnimation = true,
}: ProjectDetailViewProps) {
  const formattedPeriod = formatProjectPeriod(
    project.period,
    labels.inProgressLabel,
  )
  const hasThumbnail = Boolean(project.thumbnail)
  const hasDimensions = project.width > 0 && project.height > 0

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <EntranceMotionBlock
        delaySeconds={PROJECT_DETAIL_BLOCK_ANIMATION.HEADER_DELAY_SECONDS}
        disabled={!enableBlockEntranceAnimation}
      >
        <header className="space-y-4">
          <div className="flex items-start gap-4">
            {hasThumbnail ? (
              <span className="border-border bg-muted flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
                <CustomImage
                  src={removePublic(project.thumbnail!)}
                  alt=""
                  aria-hidden
                  className="h-full w-full object-cover"
                  imageClassName="scale-110"
                  width={hasDimensions ? project.width : undefined}
                  height={hasDimensions ? project.height : undefined}
                />
              </span>
            ) : null}
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl leading-tight font-bold sm:text-4xl">
                  {project.title}
                </h1>
                <span className="border-border bg-muted inline-flex rounded-full border px-3 py-1 text-xs font-semibold">
                  <span className="sr-only">{labels.typeLabel}</span>
                  {labels.projectTypeLabel}
                </span>
              </div>
              <p className="text-muted-foreground text-sm tabular-nums">
                <span className="sr-only">{labels.periodLabel}: </span>
                {formattedPeriod}
              </p>
              <p className="text-muted-foreground text-base leading-relaxed">
                {project.summary}
              </p>
              <ul
                aria-label={labels.techStackLabel}
                className="flex flex-wrap gap-2"
              >
                {project.techStacks.map((techStack) => (
                  <li
                    key={techStack}
                    className="border-border bg-muted rounded-full border px-2.5 py-1 text-xs font-medium"
                  >
                    {techStack}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </header>
      </EntranceMotionBlock>

      <EntranceMotionBlock
        delaySeconds={PROJECT_DETAIL_BLOCK_ANIMATION.CONTENT_DELAY_SECONDS}
        disabled={!enableBlockEntranceAnimation}
      >
        {beforeContent}
        <article
          className={cn(
            'prose prose-lg dark:prose-invert mx-auto',
            articleClassName,
          )}
        >
          {children}
        </article>
      </EntranceMotionBlock>
    </div>
  )
}
