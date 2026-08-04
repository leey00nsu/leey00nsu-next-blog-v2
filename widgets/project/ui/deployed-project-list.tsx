import { getTranslations } from 'next-intl/server'
import { getDeployedProjects } from '@/entities/project/lib/project'
import {
  DeployedProjectCard,
  type DeployedProjectCardLabels,
} from '@/entities/project/ui/deployed-project-card'
import type { DeployedProject } from '@/entities/project/model/types'
import type { SupportedLocale } from '@/shared/config/constants'
import { EntranceMotionBlock } from '@/shared/ui/entrance-motion-block'
import { calcDeployedProjectCardDelaySeconds } from '@/widgets/project/lib/deployed-project-list-motion'

interface DeployedProjectListProps {
  locale: SupportedLocale
}

export async function DeployedProjectList({
  locale,
}: DeployedProjectListProps) {
  const [projects, translate] = await Promise.all([
    getDeployedProjects(locale),
    getTranslations({ locale, namespace: 'project.list' }),
  ])

  if (projects.length === 0) {
    return (
      <p className="text-muted-foreground py-16 text-center">
        {translate('empty')}
      </p>
    )
  }

  const buildLabels = (project: DeployedProject): DeployedProjectCardLabels => {
    const isPackage = project.deployment.kind === 'package'

    return {
      status: translate(`status.${project.deployment.status}`),
      category: translate(`category.${project.deployment.category}`),
      primaryAction: translate(isPackage ? 'viewPackage' : 'viewService'),
      primaryActionAriaLabel: translate(
        isPackage ? 'viewPackageAria' : 'viewServiceAria',
        { project: project.title },
      ),
      detailAction: translate('viewDetail'),
      detailActionAriaLabel: translate('viewDetailAria', {
        project: project.title,
      }),
      githubAction: translate('viewGithub'),
      githubActionAriaLabel: translate('viewGithubAria', {
        project: project.title,
      }),
      coverImageAlt: translate('coverImageAlt', { project: project.title }),
      techStackAriaLabel: translate('techStackAria', {
        project: project.title,
      }),
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {projects.map((project, projectIndex) => (
        <EntranceMotionBlock
          key={project.slug}
          className="h-full"
          delaySeconds={calcDeployedProjectCardDelaySeconds(projectIndex)}
        >
          <DeployedProjectCard
            project={project}
            locale={locale}
            labels={buildLabels(project)}
          />
        </EntranceMotionBlock>
      ))}
    </div>
  )
}
