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
  )

  return (
    <ProjectDetailView
      project={project}
      enableBlockEntranceAnimation={false}
      articleClassName={
        firstImageContent
          ? 'break-before-page [page-break-before:always]'
          : undefined
      }
      beforeContent={
        firstImageContent ? (
          <div className="mt-6 break-inside-avoid [page-break-inside:avoid]">
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
      <MdxRenderer
        content={remainingContent}
        components={{ img: PrintMdxImage }}
      />
    </ProjectDetailView>
  )
}
