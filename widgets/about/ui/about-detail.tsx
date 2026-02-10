import { About } from '@/entities/about/model/types'
import { MdxRenderer } from '@/features/mdx/ui/mdx-renderer'
import { ProjectSection } from '@/widgets/about/ui/project-section'
import {
  PDF,
  SupportedLocale,
} from '@/shared/config/constants'
import { DownloadPdfButton } from '@/features/pdf/ui/download-pdf-button'
import type { ProjectSummaryCardLinkVariant } from '@/entities/project/ui/project-summary-card'

interface AboutDetailProps {
  about: About
  locale: SupportedLocale
  showDownloadButton?: boolean
  projectCardLinkVariant?: ProjectSummaryCardLinkVariant
}

export function AboutDetail({
  about,
  locale,
  showDownloadButton = true,
  projectCardLinkVariant,
}: AboutDetailProps) {
  return (
    <article className="prose prose-lg dark:prose-invert mx-auto">
      {showDownloadButton ? (
        <div className="not-prose mb-6 flex flex-wrap justify-end gap-2">
          <DownloadPdfButton
            locale={locale}
            documentKind={PDF.DOCUMENT_KIND.RESUME}
          />
          <DownloadPdfButton
            locale={locale}
            documentKind={PDF.DOCUMENT_KIND.PORTFOLIO}
          />
        </div>
      ) : null}
      <MdxRenderer content={about.content} />
      <div className="not-prose">
        <ProjectSection
          locale={locale}
          projectCardLinkVariant={projectCardLinkVariant}
        />
      </div>
    </article>
  )
}
