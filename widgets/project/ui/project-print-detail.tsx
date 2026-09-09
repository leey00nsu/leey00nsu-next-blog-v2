import { getTranslations } from 'next-intl/server'
import type { Project } from '@/entities/project/model/types'
import { MdxRenderer } from '@/features/mdx/ui/mdx-renderer'
import { SupportedLocale } from '@/shared/config/constants'
import { ProjectDetailView } from '@/widgets/project/ui/project-detail-view'
import { PrintMdxImage } from '@/widgets/project/ui/print-mdx-image'
import { splitLeadingMdxImages } from '@/widgets/project/lib/split-leading-mdx-images'

interface ProjectPrintDetailProps {
  project: Project
  locale: SupportedLocale
}

const PRINT_SPLIT_LEADING_MDX_IMAGES_OPTIONS = {
  preserveRemainingLeadingImages: false,
} as const

export async function ProjectPrintDetail({
  project,
  locale,
}: ProjectPrintDetailProps) {
  const t = await getTranslations({
    locale,
    namespace: 'about.projects',
  })
  const { firstImageContent, remainingContent } = splitLeadingMdxImages(
    project.content,
    PRINT_SPLIT_LEADING_MDX_IMAGES_OPTIONS,
  )
  const featuresHeading = /^## (?:주요 기능|핵심 기능|Key Features)\s*$/mu.exec(
    remainingContent,
  )
  const introductionContent = featuresHeading
    ? remainingContent.slice(0, featuresHeading.index)
    : remainingContent
  const detailContent = featuresHeading
    ? remainingContent.slice(featuresHeading.index)
    : null

  return (
    <ProjectDetailView
      project={project}
      enableBlockEntranceAnimation={false}
      articleClassName={firstImageContent ? 'pt-8' : undefined}
      beforeContent={
        firstImageContent ? (
          <div className="break-inside-avoid [page-break-inside:avoid]">
            <MdxRenderer
              content={firstImageContent}
              components={{ img: PrintMdxImage }}
            />
          </div>
        ) : null
      }
      labels={{
        inProgressLabel: t('inProgress'),
        periodLabel: t('duration'),
        techStackLabel: t('techStack'),
        typeLabel: t('type.label'),
        projectTypeLabel: t(`type.${project.type}`),
      }}
    >
      <div className="text-base leading-6 [&_h2]:mt-0 [&_p]:my-3">
        <MdxRenderer
          content={introductionContent}
          components={{ img: PrintMdxImage }}
        />
      </div>
      {detailContent ? (
        <div className="break-before-page text-base leading-6 [page-break-before:always] [&_h2]:mt-6 [&_h3]:mt-5 [&_p]:my-3">
          <MdxRenderer
            content={detailContent}
            components={{ img: PrintMdxImage }}
          />
        </div>
      ) : null}
    </ProjectDetailView>
  )
}
