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

function ProjectSectionSlot({ locale }: { locale: SupportedLocale }) {
  return (
    <div className="not-prose">
      <ProjectSection locale={locale} />
    </div>
  )
}

export function AboutDetail({
  about,
  locale,
  showDownloadButton = true,
}: AboutDetailProps) {
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
          ProjectSection: () => <ProjectSectionSlot locale={locale} />,
        }}
      />
      <ProjectSectionSlot locale={locale} />
    </article>
  )
}
