import { getTranslations } from 'next-intl/server'
import type { Project } from '@/entities/project/model/types'
import { MdxRenderer } from '@/features/mdx/ui/mdx-renderer'
import { SupportedLocale } from '@/shared/config/constants'
import { ProjectDetailView } from '@/widgets/project/ui/project-detail-view'

interface ProjectDetailProps {
  project: Project
  locale: SupportedLocale
  enableBlockEntranceAnimation?: boolean
}

export async function ProjectDetail({
  project,
  locale,
  enableBlockEntranceAnimation = true,
}: ProjectDetailProps) {
  const t = await getTranslations({
    locale,
    namespace: 'about.projects',
  })
  const inProgressLabel = t('inProgress')
  const periodLabel = t('duration')
  const techStackLabel = t('techStack')
  const typeLabel = t('type.label')
  const projectTypeLabel = t(`type.${project.type}`)

  return (
    <ProjectDetailView
      project={project}
      enableBlockEntranceAnimation={enableBlockEntranceAnimation}
      labels={{
        inProgressLabel,
        periodLabel,
        techStackLabel,
        typeLabel,
        projectTypeLabel,
      }}
    >
      <MdxRenderer content={project.content} />
    </ProjectDetailView>
  )
}
