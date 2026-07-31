import { About } from '@/entities/about/model/types'
import { MdxRenderer } from '@/features/mdx/ui/mdx-renderer'
import { ProjectSection } from '@/widgets/about/ui/project-section'
import { AboutProfileImage } from '@/widgets/about/ui/about-profile-image'
import { EntranceMotionBlock } from '@/shared/ui/entrance-motion-block'
import { PDF, SupportedLocale } from '@/shared/config/constants'
import { DownloadPdfButton } from '@/features/pdf/ui/download-pdf-button'
import { EngagementMdxAnchor } from '@/features/engagement/ui/engagement-mdx-anchor'
import type { ProjectSummaryCardLinkVariant } from '@/entities/project/ui/project-summary-card'

const ABOUT_DETAIL_BLOCK_ANIMATION = {
  DOWNLOAD_BUTTONS_DELAY_SECONDS: 0,
  PROFILE_IMAGE_DELAY_SECONDS: 0.06,
  CONTENT_DELAY_SECONDS: 0.12,
  PROJECT_SECTION_DELAY_SECONDS: 0.18,
} as const

interface AboutDetailProps {
  about: About
  locale: SupportedLocale
  showDownloadButton?: boolean
  showProjectSection?: boolean
  projectCardLinkVariant?: ProjectSummaryCardLinkVariant
  enableBlockEntranceAnimation?: boolean
}

export function AboutDetail({
  about,
  locale,
  showDownloadButton = true,
  showProjectSection = true,
  projectCardLinkVariant,
  enableBlockEntranceAnimation = true,
}: AboutDetailProps) {
  return (
    <article className="prose prose-lg dark:prose-invert mx-auto">
      {showDownloadButton ? (
        <EntranceMotionBlock
          className="not-prose"
          delaySeconds={
            ABOUT_DETAIL_BLOCK_ANIMATION.DOWNLOAD_BUTTONS_DELAY_SECONDS
          }
          disabled={!enableBlockEntranceAnimation}
        >
          <div className="mb-6 flex flex-wrap justify-end gap-2">
            <DownloadPdfButton
              locale={locale}
              documentKind={PDF.DOCUMENT_KIND.RESUME}
            />
            <DownloadPdfButton
              locale={locale}
              documentKind={PDF.DOCUMENT_KIND.PORTFOLIO}
            />
          </div>
        </EntranceMotionBlock>
      ) : null}
      <EntranceMotionBlock
        className="not-prose"
        delaySeconds={ABOUT_DETAIL_BLOCK_ANIMATION.PROFILE_IMAGE_DELAY_SECONDS}
        disabled={!enableBlockEntranceAnimation}
      >
        <AboutProfileImage />
      </EntranceMotionBlock>
      <EntranceMotionBlock
        delaySeconds={ABOUT_DETAIL_BLOCK_ANIMATION.CONTENT_DELAY_SECONDS}
        disabled={!enableBlockEntranceAnimation}
      >
        <MdxRenderer
          content={about.content}
          components={{ a: EngagementMdxAnchor }}
        />
      </EntranceMotionBlock>
      {showProjectSection ? (
        <EntranceMotionBlock
          className="not-prose"
          delaySeconds={
            ABOUT_DETAIL_BLOCK_ANIMATION.PROJECT_SECTION_DELAY_SECONDS
          }
          disabled={!enableBlockEntranceAnimation}
        >
          <ProjectSection
            locale={locale}
            projectCardLinkVariant={projectCardLinkVariant}
          />
        </EntranceMotionBlock>
      ) : null}
    </article>
  )
}
