import { About } from '@/entities/about/model/types'
import { MdxRenderer } from '@/features/mdx/ui/mdx-renderer'
import { ProjectSection } from '@/widgets/about/ui/project-section'
import { SupportedLocale } from '@/shared/config/constants'
import { DownloadResumeButton } from '@/features/pdf/ui/download-resume-button'

interface AboutDetailProps {
  about: About
  locale: SupportedLocale
  showDownloadButton?: boolean
}

export function AboutDetail({ about, locale, showDownloadButton = true }: AboutDetailProps) {
  function ProjectSectionSlot() {
    return (
      <div className="not-prose">
        <ProjectSection locale={locale} />
      </div>
    )
  }

  return (
    <article className="prose prose-lg dark:prose-invert mx-auto">
      {showDownloadButton ? (
        <div className="not-prose mb-6 flex justify-end">
          <DownloadResumeButton locale={locale} />
        </div>
      ) : null}
      <MdxRenderer
        content={about.content}
        components={{
          ProjectSection: ProjectSectionSlot,
        }}
      />
      <ProjectSectionSlot />
    </article>
  )
}
